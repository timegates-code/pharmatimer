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
 * minuti su intervallo > 24h è clinicamente irrilevante (~0.18% per 168h)
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

function patchEntry(plan, entryKey, patch) {
  let updated = null;
  const newPlan = plan.map((e) => {
    if (e.key !== entryKey) return e;
    updated = { ...e, ...patch };
    return updated;
  });
  return { plan: newPlan, entry: updated };
}

function findNextDose(plan, farmacoId, dateStr, doseNumero) {
  const sameDay = plan.find(
    (e) =>
      e.farmaco.id === farmacoId &&
      e.dateStr === dateStr &&
      e.orario.dose_numero === doseNumero + 1
  );
  if (sameDay) return sameDay;
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

export function applySalto(plan, entryKey) {
  const target = plan.find((e) => e.key === entryKey);
  let { plan: p, entry: targetPatched } = patchEntry(plan, entryKey, {
    stato: 'saltata',
  });
  const logWrites = [buildLogWrite(targetPatched)];

  const nextDose = findNextDose(
    p,
    target.farmaco.id,
    target.dateStr,
    target.orario.dose_numero
  );

  if (nextDose && nextDose.stato !== 'presa') {
    let nextPatch;
    if (target.farmaco.tipo_frequenza === 'intervallo') {
      nextPatch = {
        gap_minuti: target.gap_minuti,
        gap_originale: target.gap_minuti,
        dose_prec_saltata: true,
      };
    } else {
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
 * Register a dose assumption.
 *
 * CP9 v3.0.0 Step 2 (§6.187): the gap_recovery prompt is suppressed for
 * extended-frequency farmaci (intervallo_ore > 24h). Ricalcolo N+1 still
 * happens (gap_minuti recorded on N+1) but no auto-prompt is emitted —
 * the UI gate in DoseCard hides the gap badge anyway, so a prompt would
 * point to an invisible affordance. §22.42 EXT.4 ratified.
 */
export function applyAssunzione(plan, input) {
  const { entryKey, dataEffettiva, oraEffettiva } = input;
  const target = plan.find((e) => e.key === entryKey);

  const gapBefore = target.gap_minuti;
  const recuperoBefore = target.recupero_minuti;

  const { plan: planAfterSkip, skipped } = autoSkip(
    plan,
    target.farmaco.id,
    target.dateStr,
    target.orario.dose_numero
  );

  const plannedTime = target.ora_ricalcolata || target.ora_prevista;
  const delta = calcolaDelta({
    dataPrevista: target.dateStr,
    oraPrevista: plannedTime,
    dataEffettiva,
    oraEffettiva,
  });

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

  const logWrites = skipped.map(buildLogWrite);
  logWrites.push(buildLogWrite(targetPatched));

  let p = planWithTarget;
  let prompt = null;

  if (target.farmaco.tipo_frequenza === 'intervallo' && target.farmaco.intervallo_ore != null) {
    const nextDose = findNextDose(
      p,
      target.farmaco.id,
      target.dateStr,
      target.orario.dose_numero
    );
    if (nextDose && nextDose.stato !== 'presa') {
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

      // CP9 §6.187: gate prompt emission on standard-interval farmaci only.
      // Extended (intervallo_ore > 24h) → gap_recovery is clinically irrilevante
      // e UI-hidden via DoseCard gate; emitting the prompt would point at an
      // affordance the user can't see (§22.42 EXT.4).
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

export function applyRecupero(plan, entryKey, recuperoMinuti) {
  const target = plan.find((e) => e.key === entryKey);

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

export function applyAnnullaAssunzione(plan, entryKey) {
  const target = plan.find((e) => e.key === entryKey);

  const nextDoseBefore = findNextDose(
    plan, target.farmaco.id, target.dateStr, target.orario.dose_numero
  );
  if (nextDoseBefore && (nextDoseBefore.stato === 'presa' || nextDoseBefore.stato === 'sospesa')) {
    throw new DomainError(
      'DOWNSTREAM_USER_EDITS',
      'Impossibile annullare: la dose successiva è già stata registrata o sospesa.'
    );
  }

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

  const logWrites = [buildLogWrite(targetPatched)];

  let p = planAfterTarget;

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
    return { ...e, ora_prevista: nuovaOraPrevista };
  });
}

export function applyRipristino(plan, entryKey, to) {
  const target = plan.find((e) => e.key === entryKey);

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

  const newStato =
    to === 'sospesa'
      ? 'sospesa'
      : target.ora_ricalcolata != null
        ? 'ricalcolata'
        : 'prevista';

  const { plan: planAfterTarget, entry: targetPatched } = patchEntry(
    plan,
    entryKey,
    { stato: newStato }
  );
  const logWrites = [buildLogWrite(targetPatched)];
  let p = planAfterTarget;

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
