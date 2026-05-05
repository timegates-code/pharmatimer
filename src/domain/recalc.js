/**
 * @fileoverview Recalculation and gap recovery domain logic (spec sez. 4).
 *
 * All exported functions are PURE:
 *   - no Date.now(), no globals, no DB, no console.log, no fetch
 *   - input → output, no mutation of input plan or entries
 *   - temporal inputs (dataEffettiva, oraEffettiva) always passed by the caller
 *
 * Every `apply*` returns an ApplyResult:
 *   { plan: Plan, logWrites: LogAssunzione[], prompt: AutoPrompt|null }
 *
 * INVARIANT (logWrites): every PlanEntry whose final state differs from its
 * initial state produces exactly one LogAssunzione in logWrites. Entries not
 * touched by an operation do NOT generate logWrites. The order of logWrites
 * is not a contract.
 *
 * See Changelog Fase 2 §6.8–6.16 for design decisions.
 * Sessione 9-A (§6.115b): `ora_ricalcolata` carries an ISO datetime
 * 'YYYY-MM-DDTHH:MM' instead of bare HH:MM, fixing §6.18 cross-midnight.
 *
 * CP9 v3.0.0 Step 2 (§6.187): gap recovery prompt emit gated on
 * `target.farmaco.intervallo_ore <= 24` per §22.42 EXT.4. Recovering N
 * minuti su intervallo > 24h e clinicamente irrilevante (~0.18% per 168h)
 * e confonde UX. `applyRecupero` stesso non riceve gate (matematicamente
 * valido per qualsiasi intervallo, AUDIT.5 §22.42); il gate UI in DoseCard
 * + FarmaciTab impedisce trigger user-side per farmaci extended.
 */

import { calcolaDelta, composeIsoDateTime, addMinutesToIso } from '../utils/time.js';
import { SOGLIA_PROMPT_RECUPERO } from './constants.js';
import { DomainError } from './errors.js';
import { computeOraPrevista } from './orarioResolver.js';

// ============================================================
// INTERNAL HELPERS (not exported)
// ============================================================

/**
 * Project a PlanEntry to its LogAssunzione shape for persistence.
 * The caller (repository.upsertLog) handles the actual write.
 *
 * @param {import('./types.js').PlanEntry} entry
 * @returns {import('./types.js').LogAssunzione}
 */
function buildLogWrite(entry) {
  return {
    farmaco_id: entry.farmaco.id,
    data: entry.dateStr,
    dose_numero: entry.orario.dose_numero,
    ora_prevista: entry.ora_prevista,
    ora_effettiva: entry.ora_effettiva,
    delta_minuti: entry.delta_minuti,
    ora_ricalcolata: entry.ora_ricalcolata,
    gap_minuti: entry.gap_minuti,
    recupero_minuti: entry.recupero_minuti,
    stato: entry.stato,
    note: null,
  };
}

/**
 * Produce a new plan where the entry matching `entryKey` is replaced by
 * a shallow copy with `patch` applied. Returns { plan, entry } where
 * `entry` is the newly-updated entry (post-patch).
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @param {Partial<import('./types.js').PlanEntry>} patch
 * @returns {{ plan: import('./types.js').Plan, entry: import('./types.js').PlanEntry }}
 */
function patchEntry(plan, entryKey, patch) {
  let updated = null;
  const newPlan = plan.map((e) => {
    if (e.key !== entryKey) return e;
    updated = { ...e, ...patch };
    return updated;
  });
  return { plan: newPlan, entry: updated };
}

/**
 * Find the next dose for the given farmaco after (dateStr, doseNumero).
 * Lookup order:
 *   1. same day, dose_numero + 1
 *   2. first following day with dose_numero === 1 for the same farmaco
 *
 * @param {import('./types.js').Plan} plan
 * @param {number} farmacoId
 * @param {string} dateStr
 * @param {number} doseNumero
 * @returns {import('./types.js').PlanEntry | null}
 */
function findNextDose(plan, farmacoId, dateStr, doseNumero) {
  // Same day: next dose_numero
  const sameDay = plan.find(
    (e) =>
      e.farmaco.id === farmacoId &&
      e.dateStr === dateStr &&
      e.orario.dose_numero === doseNumero + 1
  );
  if (sameDay) return sameDay;

  // Cross-day: first following day whose dose_numero === 1 for the same farmaco.
  // We iterate forward day by day because the plan may span multiple days and
  // we want the earliest occurrence.
  const candidates = plan
    .filter(
      (e) =>
        e.farmaco.id === farmacoId &&
        e.orario.dose_numero === 1 &&
        e.dateStr > dateStr
    )
    .sort((a, b) => (a.dateStr < b.dateStr ? -1 : 1));
  return candidates[0] ?? null;
}

// ============================================================
// EXPORTED FUNCTIONS
// ============================================================

/**
 * Compute the maximum recovery (minutes) applicable to a recalculated dose,
 * bounded by:
 *   (a) the accumulated gap itself (cannot recover more than what was lost),
 *   (b) the safety minimum interval (intervallo_minimo_ore), if defined:
 *       maxBySafety = (intervallo_ore - intervallo_minimo_ore) * 60
 *
 * If gapMinuti <= 0, returns 0 (no recovery applicable to anticipazione residua).
 *
 * Single source of truth for the slider upper bound in the UI.
 *
 * @param {import('./types.js').Farmaco} farmaco
 * @param {number} gapMinuti
 * @returns {number}
 */
export function calcolaRecuperoMax(farmaco, gapMinuti) {
  if (gapMinuti <= 0) return 0;
  const maxByGap = gapMinuti;
  if (
    farmaco.intervallo_ore != null &&
    farmaco.intervallo_minimo_ore != null
  ) {
    const maxBySafety =
      (farmaco.intervallo_ore - farmaco.intervallo_minimo_ore) * 60;
    return Math.min(maxByGap, maxBySafety);
  }
  return maxByGap;
}

/**
 * Mark a dose as "sospesa" (intentional non-administration). No propagation,
 * no warning on the next dose. Pure state change.
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @returns {import('./types.js').ApplyResult}
 */
export function applySospensione(plan, entryKey) {
  const { plan: newPlan, entry } = patchEntry(plan, entryKey, {
    stato: 'sospesa',
  });
  return {
    plan: newPlan,
    logWrites: [buildLogWrite(entry)],
    prompt: null,
  };
}

/**
 * Mark a dose as "saltata" (forgotten).
 *
 * Semantics:
 *   - interval farmaci: the existing gap_minuti on the target is propagated
 *     UNCHANGED to the next dose (pass-through — no new delay added).
 *     Flag dose_prec_saltata=true on N+1.
 *   - fixed-schedule farmaci: only the dose_prec_saltata flag on N+1.
 *
 * DESIGN NOTE: applySalto does NOT emit an auto-prompt even if the propagated
 * gap exceeds SOGLIA_PROMPT_RECUPERO. Rationale: marking a dose as skipped and
 * immediately popping up a gap-recovery modal would be jarring UX. The user
 * can still tap the gap badge manually on the next dose card to open it.
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @returns {import('./types.js').ApplyResult}
 */
export function applySalto(plan, entryKey) {
  const target = plan.find((e) => e.key === entryKey);
  // Contract: entryKey is always valid (caller guarantees). No defensive check.

  // Patch the target: stato='saltata'.
  let { plan: p, entry: targetPatched } = patchEntry(plan, entryKey, {
    stato: 'saltata',
  });
  /** @type {import('./types.js').LogAssunzione[]} */
  const logWrites = [buildLogWrite(targetPatched)];

  // Find the next dose (same day or cross-day).
  const nextDose = findNextDose(
    p,
    target.farmaco.id,
    target.dateStr,
    target.orario.dose_numero
  );

  if (nextDose && nextDose.stato !== 'presa') {
    /** @type {Partial<import('./types.js').PlanEntry>} */
    let nextPatch;
    if (target.farmaco.tipo_frequenza === 'intervallo') {
      // Pass-through: propagate target.gap_minuti UNCHANGED to N+1.
      nextPatch = {
        gap_minuti: target.gap_minuti,
        gap_originale: target.gap_minuti,
        dose_prec_saltata: true,
      };
    } else {
      // Fixed-schedule: only the warning flag.
      nextPatch = {
        dose_prec_saltata: true,
      };
    }
    const { plan: p2, entry: nextPatched } = patchEntry(p, nextDose.key, nextPatch);
    p = p2;
    logWrites.push(buildLogWrite(nextPatched));
  }

  return {
    plan: p,
    logWrites,
    prompt: null,
  };
}

// ============================================================
// CP2 — autoSkip helper, applyAssunzione, applyRecupero
// ============================================================

/**
 * Mark as 'saltata' every prior dose (dose_numero < targetDoseNumero) of the
 * same farmaco on the same day that is still in state 'prevista' or
 * 'ricalcolata'. Per Changelog §6.12:
 *   - the gap_minuti of skipped doses is NOT added to the target (which has
 *     its own delta);
 *   - the dose_prec_saltata flag is NOT written here: applyAssunzione writes
 *     it on N+1 (the next dose after target).
 *
 * Returns the updated plan along with the list of skipped-dose entries
 * (in their post-patch form, to build their logWrites from).
 *
 * @param {import('./types.js').Plan} plan
 * @param {number} farmacoId
 * @param {string} dateStr
 * @param {number} targetDoseNumero
 * @returns {{ plan: import('./types.js').Plan, skipped: import('./types.js').PlanEntry[] }}
 */
function autoSkip(plan, farmacoId, dateStr, targetDoseNumero) {
  const skipped = [];
  const newPlan = plan.map((e) => {
    if (
      e.farmaco.id === farmacoId &&
      e.dateStr === dateStr &&
      e.orario.dose_numero < targetDoseNumero &&
      (e.stato === 'prevista' || e.stato === 'ricalcolata')
    ) {
      const patched = { ...e, stato: 'saltata' };
      skipped.push(patched);
      return patched;
    }
    return e;
  });
  return { plan: newPlan, skipped };
}

/**
 * Register a dose assumption. Unifies the "tap PRESA" flow (now) and the
 * "l'ho presa alle..." retroactive flow: the caller always provides
 * dataEffettiva and oraEffettiva.
 *
 * Semantics (see spec sez. 4.2 / 4.3 and Changelog §6.10, §6.12):
 *   - target → stato='presa', ora_effettiva, delta_minuti
 *   - prior same-day doses of same farmaco still 'prevista'/'ricalcolata'
 *     → stato='saltata' (via autoSkip; gap NOT summed onto target)
 *   - if tipo_frequenza='intervallo' and next dose exists (same-day
 *     dose_numero+1, or cross-day first day with dose_numero=1):
 *       * ora_ricalcolata = composeIsoDateTime(dataEffettiva, oraEffettiva)
 *         + intervallo_ore minuti via addMinutesToIso (ISO 'YYYY-MM-DDTHH:MM',
 *         carry-over across midnight handled by Date arithmetic — §6.115b)
 *       * ora_ricalcolata_originale = same
 *       * stato='ricalcolata'
 *       * gap_minuti = (target.gap_minuti before presa) - (target.recupero_minuti before presa) + delta
 *       * gap_originale = same
 *       * recupero_minuti = 0 (reset)
 *       * dose_prec_saltata = true IFF autoSkip skipped at least one dose
 *   - if the next-dose newGap > SOGLIA_PROMPT_RECUPERO:
 *       prompt = { kind: 'gap_recovery', entryKey: nextDose.key }
 *   - NOTE on delta: computed against (ora_ricalcolata || ora_prevista) on
 *     target.dateStr, using calcolaDelta (DATETIME-based, no wraparound).
 *
 * INVARIANT (logWrites): every entry modified produces one LogAssunzione.
 * Ordering in logWrites: [skipped...] + [target] + [next-dose if modified].
 *
 * CROSS-MIDNIGHT (Sessione 9-A, §6.115b): when the recalculated time of
 * N+1 falls on the next calendar day (e.g. 23:00 + 8h), `ora_ricalcolata`
 * stores the full ISO 'YYYY-MM-DDTHH:MM'. The entry's `dateStr` itself is
 * not moved — entries are pre-allocated per day by buildMultiDayPlan; only
 * the ricalcolata datetime is shifted forward. UI consumers parse the ISO
 * via parseIsoDateTime to display the HH:MM and detect cross-day overflow.
 *
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').AssunzioneInput} input
 * @returns {import('./types.js').ApplyResult}
 */
export function applyAssunzione(plan, input) {
  const { entryKey, dataEffettiva, oraEffettiva } = input;
  const target = plan.find((e) => e.key === entryKey);
  // Contract: entryKey always valid.

  // Snapshot target's pre-assumption gap/recupero: these feed the newGap formula.
  const gapBefore = target.gap_minuti;
  const recuperoBefore = target.recupero_minuti;

  // Step 1: auto-skip prior same-day doses.
  const { plan: planAfterSkip, skipped } = autoSkip(
    plan,
    target.farmaco.id,
    target.dateStr,
    target.orario.dose_numero
  );

  // Step 2: compute delta against the effective planned time (ricalcolata
  // wins over prevista) on the target's dateStr.
  const plannedTime = target.ora_ricalcolata || target.ora_prevista;
  const delta = calcolaDelta({
    dataPrevista: target.dateStr,
    oraPrevista: plannedTime,
    dataEffettiva,
    oraEffettiva,
  });

  // Step 3: patch target → 'presa'.
  const oraEffettivaIso = `${dataEffettiva}T${oraEffettiva}:00`;
  const { plan: planWithTarget, entry: targetPatched } = patchEntry(
    planAfterSkip,
    entryKey,
    {
      stato: 'presa',
      ora_effettiva: oraEffettivaIso,
      delta_minuti: delta,
    }
  );

  /** @type {import('./types.js').LogAssunzione[]} */
  const logWrites = skipped.map(buildLogWrite);
  logWrites.push(buildLogWrite(targetPatched));

  let p = planWithTarget;
  /** @type {import('./types.js').AutoPrompt|null} */
  let prompt = null;

  // Step 4: recalculate N+1 if farmaco is interval-based.
  if (target.farmaco.tipo_frequenza === 'intervallo' && target.farmaco.intervallo_ore != null) {
    const nextDose = findNextDose(
      p,
      target.farmaco.id,
      target.dateStr,
      target.orario.dose_numero
    );
    if (nextDose && nextDose.stato !== 'presa') {
      // §6.115b — Compose ISO from effective datetime, shift by intervallo.
      // addMinutesToIso handles cross-midnight carry-over.
      const effIso = composeIsoDateTime(dataEffettiva, oraEffettiva);
      const newRicalc = addMinutesToIso(effIso, target.farmaco.intervallo_ore * 60);
      const newGap = gapBefore - recuperoBefore + delta;

      const { plan: p2, entry: nextPatched } = patchEntry(p, nextDose.key, {
        ora_ricalcolata: newRicalc,
        ora_ricalcolata_originale: newRicalc,
        stato: 'ricalcolata',
        gap_minuti: newGap,
        gap_originale: newGap,
        recupero_minuti: 0,
        dose_prec_saltata: skipped.length > 0,
      });
      p = p2;
      logWrites.push(buildLogWrite(nextPatched));

      // CP9 §6.187 EXT.4: gate prompt su intervallo_ore <= 24.
      // Extended (>24h) -> gap_recovery clinicamente irrilevante e UI-hidden
      // via DoseCard gate; emettere prompt punterebbe ad affordance invisibile.
      if (
        newGap > SOGLIA_PROMPT_RECUPERO &&
        target.farmaco.intervallo_ore <= 24
      ) {
        prompt = { kind: 'gap_recovery', entryKey: nextPatched.key };
      }
    }
  }

  return { plan: p, logWrites, prompt };
}

/**
 * Apply a gap recovery to a recalculated dose. Validates:
 *   - RECUPERO_NEGATIVO       : recuperoMinuti < 0
 *   - RECUPERO_SU_DOSE_NON_RICALCOLATA : entry.stato !== 'ricalcolata'
 *   - RECUPERO_ECCESSIVO      : recuperoMinuti > calcolaRecuperoMax(farmaco, entry.gap_minuti)
 *
 * Effect (on valid input):
 *   ora_ricalcolata = ora_ricalcolata_originale - recuperoMinuti
 *     (computed via addMinutesToIso, ISO 'YYYY-MM-DDTHH:MM' — §6.115b)
 *   recupero_minuti = recuperoMinuti
 * gap_minuti and gap_originale are left untouched (the residual gap is computed
 * at the moment the dose is actually taken — see spec sez. 4.3).
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @param {number} recuperoMinuti
 * @returns {import('./types.js').ApplyResult}
 * @throws {DomainError}
 */
export function applyRecupero(plan, entryKey, recuperoMinuti) {
  const target = plan.find((e) => e.key === entryKey);
  // Contract: entryKey always valid.

  if (recuperoMinuti < 0) {
    throw new DomainError(
      'RECUPERO_NEGATIVO',
      `Il recupero non può essere negativo (ricevuto: ${recuperoMinuti}).`
    );
  }
  if (target.stato !== 'ricalcolata') {
    throw new DomainError(
      'RECUPERO_SU_DOSE_NON_RICALCOLATA',
      `Il recupero si applica solo a dosi in stato 'ricalcolata' (stato attuale: '${target.stato}').`
    );
  }
  const maxRecupero = calcolaRecuperoMax(target.farmaco, target.gap_minuti);
  if (recuperoMinuti > maxRecupero) {
    throw new DomainError(
      'RECUPERO_ECCESSIVO',
      `Recupero ${recuperoMinuti} min eccede il massimo consentito (${maxRecupero} min).`
    );
  }

  const baseTime = target.ora_ricalcolata_originale || target.ora_ricalcolata;
  const newOraRicalc = addMinutesToIso(baseTime, -recuperoMinuti);

  const { plan: newPlan, entry: patched } = patchEntry(plan, entryKey, {
    ora_ricalcolata: newOraRicalc,
    recupero_minuti: recuperoMinuti,
  });

  return {
    plan: newPlan,
    logWrites: [buildLogWrite(patched)],
    prompt: null,
  };
}

// ============================================================
// CP3 — applyAnnullaAssunzione, ricalcolaPianoDaProfilo
// ============================================================

/**
 * Undo a previously registered assumption. Inverse of applyAssunzione for
 * the most recently taken dose.
 *
 * Target restoration (see Changelog §6.14):
 *   - stato: 'ricalcolata' if entry.ora_ricalcolata != null at this point,
 *     otherwise 'prevista'.
 *     (In the current model a dose becomes 'presa' from either 'prevista' or
 *     'ricalcolata'; we don't track the pre-presa state explicitly, so we
 *     derive it from the presence of ora_ricalcolata.)
 *   - ora_effettiva → null
 *   - delta_minuti → null
 *
 * Next-dose restoration (N+1):
 *   - Only if N+1.stato === 'ricalcolata' (the state set by applyAssunzione).
 *     If N+1 is in any other state (presa/saltata/sospesa/prevista), leave
 *     it untouched.
 *   - Reset: ora_ricalcolata, ora_ricalcolata_originale → null;
 *     gap_minuti, gap_originale, recupero_minuti → 0;
 *     dose_prec_saltata → false; stato → 'prevista'.
 *   - Any user-applied recupero on N+1 is lost (undo = full restore).
 *
 * KNOWN LIMITATION (documented in Changelog §6.14 amendment): if
 * applyAssunzione auto-skipped prior same-day doses, applyAnnullaAssunzione does
 * NOT revive them — autoSkip doesn't track causal origin. The user would
 * have to manually re-open those doses in a future UI step.
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @returns {import('./types.js').ApplyResult}
 */
export function applyAnnullaAssunzione(plan, entryKey) {
  const target = plan.find((e) => e.key === entryKey);
  // Contract: entryKey always valid.

  // Guard DOWNSTREAM_USER_EDITS (Sessione 7d-2 CP4, Changelog §6.61).
  // If N+1 is in a user-only state ('presa' or 'sospesa'), the ricalcolata
  // chain has been superseded by manual intervention; undoing N would
  // desync it. N+1 'ricalcolata' is always treated as auto-produced (no
  // user-edited marker in the model today).
  const nextDoseBefore = findNextDose(
    plan, target.farmaco.id, target.dateStr, target.orario.dose_numero
  );
  if (nextDoseBefore && (nextDoseBefore.stato === 'presa' || nextDoseBefore.stato === 'sospesa')) {
    throw new DomainError(
      'DOWNSTREAM_USER_EDITS',
      'Impossibile annullare: la dose successiva è già stata registrata o sospesa.'
    );
  }

  // Restore target.
  const restoredStato = target.ora_ricalcolata != null ? 'ricalcolata' : 'prevista';
  const { plan: planAfterTarget, entry: targetPatched } = patchEntry(
    plan,
    entryKey,
    {
      stato: restoredStato,
      ora_effettiva: null,
      delta_minuti: null,
    }
  );

  /** @type {import('./types.js').LogAssunzione[]} */
  const logWrites = [buildLogWrite(targetPatched)];

  let p = planAfterTarget;

  // Restore N+1 (only if currently 'ricalcolata').
  const nextDose = findNextDose(
    p,
    target.farmaco.id,
    target.dateStr,
    target.orario.dose_numero
  );
  if (nextDose && nextDose.stato === 'ricalcolata') {
    const { plan: p2, entry: nextPatched } = patchEntry(p, nextDose.key, {
      ora_ricalcolata: null,
      ora_ricalcolata_originale: null,
      gap_minuti: 0,
      gap_originale: 0,
      recupero_minuti: 0,
      dose_prec_saltata: false,
      stato: 'prevista',
    });
    p = p2;
    logWrites.push(buildLogWrite(nextPatched));
  }

  return { plan: p, logWrites, prompt: null };
}

/**
 * Recompute ora_prevista on every entry by applying the new profile.
 *
 * NOTA IMPORTANTE — entries in stato 'presa':
 * ora_prevista viene aggiornato al nuovo profilo, ma ora_effettiva e
 * delta_minuti restano invariati. Questo significa che dopo il ricalcolo
 * delta_minuti NON corrisponde più a (ora_effettiva - ora_prevista):
 * delta è un fatto storico rispetto al programma vigente al momento
 * dell'assunzione, non una quantità derivabile dai campi correnti.
 *
 * Se in futuro servirà il "delta ricalcolato sul nuovo profilo", si
 * aggiungerà un campo dedicato — delta_minuti non va mai sovrascritto.
 *
 * NOTA — entries in stato 'ricalcolata':
 * vengono resettate a 'prevista' con ora_ricalcolata=null,
 * ora_ricalcolata_originale=null, gap_minuti=0, gap_originale=0,
 * recupero_minuti=0. La catena di ricalcolo rispetto al profilo precedente
 * non ha più significato con il nuovo schema — l'utente riparte pulito.
 * Questa scelta è documentata nel Changelog Fase 2 §6.15 (AMB-3).
 *
 * NOTA — entries in stato 'saltata' / 'sospesa':
 * ora_prevista aggiornata; tutti gli altri campi invariati.
 *
 * Questa funzione NON ritorna ApplyResult: nessun logWrite, nessun prompt.
 * È uso previsto che il chiamante (es. repository.setProfiloAttivo) azzeri
 * ora_prevista in orari_base usando computeOraPrevista separatamente; questa
 * funzione opera sul piano in-memory.
 *
 * @param {import('./types.js').Plan} plan
 * @param {import('./types.js').Profilo} nuovoProfilo
 * @returns {import('./types.js').Plan}
 */
export function ricalcolaPianoDaProfilo(plan, nuovoProfilo) {
  return plan.map((e) => {
    const nuovaOraPrevista = computeOraPrevista(e.orario, nuovoProfilo);
    if (e.stato === 'ricalcolata') {
      return {
        ...e,
        ora_prevista: nuovaOraPrevista,
        ora_ricalcolata: null,
        ora_ricalcolata_originale: null,
        gap_minuti: 0,
        gap_originale: 0,
        recupero_minuti: 0,
        stato: 'prevista',
        dose_prec_saltata: false,
      };
    }
    // For 'prevista', 'presa', 'saltata', 'sospesa': only ora_prevista is refreshed.
    return { ...e, ora_prevista: nuovaOraPrevista };
  });
}

// ============================================================
// CP5 — applyRipristino (Sessione 5a)
// ============================================================

/**
 * Restore a dose from 'saltata' or 'sospesa' to another state.
 *
 * Covers these UI flows (v5 mockup modals, documented in Changelog §6.19):
 *   - SospesaCorrectModal → "Ripristina come da prendere": to='attiva'
 *   - SaltataCorrectModal → "Cambia in sospesa":            to='sospesa'
 *   - (sospesa → saltata transitions through applySalto directly, not here:
 *      per Q5, applySalto tolerates target.stato='sospesa' as input.)
 *
 * Semantics:
 *   - Target state resolves as:
 *       to='attiva'  → 'ricalcolata' if entry.ora_ricalcolata != null, else 'prevista'
 *       to='sospesa' → 'sospesa'
 *   - Starting from 'saltata': if N+1 exists AND N+1.stato === 'prevista'
 *     AND N+1.dose_prec_saltata === true, rollback N+1:
 *       gap_minuti = 0, gap_originale = 0, dose_prec_saltata = false.
 *   - Starting from 'sospesa': no N+1 changes (sospesa doesn't propagate).
 *
 * LIMITATION A (marker-based rollback): rollback on N+1 runs only when the
 * dose_prec_saltata marker is still present AND N+1 is still 'prevista'.
 * If the user has subsequently taken, sospended, or re-skipped N+1, the
 * rollback is skipped to avoid corrupting downstream chain state. This is
 * more conservative than the v5 mockup's handleChangeToSospesa (which
 * rolled back as long as N+1 !== 'preso') and is a correctness improvement.
 *
 * LIMITATION B (lossy gap rollback): the rollback resets N+1.gap_minuti
 * to 0, not to its pre-applySalto value. In the rare case of a chain
 * (saltata → saltata → saltata), this erases intermediate residual gap.
 * Acceptable per §6.17 precedent on unmaintained causal history.
 *
 * @param {import('./types.js').Plan} plan
 * @param {string} entryKey
 * @param {'attiva'|'sospesa'} to
 * @returns {import('./types.js').ApplyResult}
 * @throws {DomainError}
 *   - RIPRISTINO_STATO_INVALIDO: target.stato not in {'saltata','sospesa'}
 *   - RIPRISTINO_TARGET_INVALIDO: to not in {'attiva','sospesa'}
 *   - RIPRISTINO_NOOP: 'sospesa' → 'sospesa' (no transition)
 */
export function applyRipristino(plan, entryKey, to) {
  const target = plan.find((e) => e.key === entryKey);
  // Contract: entryKey always valid.

  if (target.stato !== 'saltata' && target.stato !== 'sospesa') {
    throw new DomainError(
      'RIPRISTINO_STATO_INVALIDO',
      `applyRipristino richiede stato 'saltata' o 'sospesa' (attuale: '${target.stato}').`
    );
  }
  if (to !== 'attiva' && to !== 'sospesa') {
    throw new DomainError(
      'RIPRISTINO_TARGET_INVALIDO',
      `Target di ripristino deve essere 'attiva' o 'sospesa' (ricevuto: '${to}').`
    );
  }
  if (target.stato === 'sospesa' && to === 'sospesa') {
    throw new DomainError(
      'RIPRISTINO_NOOP',
      "La dose è già in stato 'sospesa'."
    );
  }

  // Resolve new stato.
  const newStato =
    to === 'sospesa'
      ? 'sospesa'
      : target.ora_ricalcolata != null
        ? 'ricalcolata'
        : 'prevista';

  // Patch target.
  const { plan: planAfterTarget, entry: targetPatched } = patchEntry(
    plan,
    entryKey,
    { stato: newStato }
  );
  /** @type {import('./types.js').LogAssunzione[]} */
  const logWrites = [buildLogWrite(targetPatched)];
  let p = planAfterTarget;

  // Rollback N+1 only if starting from 'saltata' (sospesa doesn't propagate).
  if (target.stato === 'saltata') {
    const nextDose = findNextDose(
      p,
      target.farmaco.id,
      target.dateStr,
      target.orario.dose_numero
    );
    if (
      nextDose &&
      nextDose.stato === 'prevista' &&
      nextDose.dose_prec_saltata === true
    ) {
      const { plan: p2, entry: nextPatched } = patchEntry(p, nextDose.key, {
        gap_minuti: 0,
        gap_originale: 0,
        dose_prec_saltata: false,
      });
      p = p2;
      logWrites.push(buildLogWrite(nextPatched));
    }
  }

  return { plan: p, logWrites, prompt: null };
}
