import { timeToMinutes, addMinutesToIso } from '../utils/time.js';
import {
  computeOraPrevista,
  computeOraPrevistaOnDay,
  isOrarioNonRisolvibile,
} from './orarioResolver.js';
import {
  isExtendedInterval,
  computeExtendedOccurrencesInWindow,
} from './extendedFrequency.js';
import { computeTInizio } from './startBoundary.js';

// Re-export for backward compatibility with existing consumers and tests
// that import { computeOraPrevista } from './planBuilder.js'.
// Canonical location is ./orarioResolver.js — see Changelog Fase 2 §6.16.
export { computeOraPrevista };

/**
 * Pure plan builder. Computes a derived view of (date, farmaco, dose) rows
 * from profilo + farmaci + orari_base + log_assunzioni.
 *
 * Purity rule: no Date.now(), no DB, no globals. Everything comes from ctx.
 * Input contract: data is well-formed (Step 4a — no defensive validation).
 *
 * Two-branch iteration model (§22.42 opt B' modulare):
 *   - Standard branch (tipo_frequenza='fisso' OR intervallo_ore<=24): per-day
 *     loop, one entry per orario_base row per active day.
 *   - Extended branch (intervallo_ore>24): post-loop pass via
 *     computeExtendedOccurrencesInWindow(). Path standard intoccato
 *     (zero rischio regressione su test esistenti).
 */

/**
 * Add n days to 'YYYY-MM-DD'. Local duplicate of utils/time addDays to avoid
 * exposing that internal here; kept private.
 */
function addDaysLocal(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Check whether a farmaco is active on a given date.
 * Inactive farmaci (attivo=0) are always filtered out.
 * data_inizio and data_fine (if present) bound the range inclusively.
 *
 * @param {import('./types.js').Farmaco} farmaco
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {boolean}
 */
function isFarmacoActiveOn(farmaco, dateStr) {
  if (!farmaco.attivo) return false;
  if (farmaco.data_inizio && farmaco.data_inizio > dateStr) return false;
  if (farmaco.data_fine && farmaco.data_fine < dateStr) return false;
  return true;
}

/**
 * Build the plan entry key. Stable across sessions.
 * @param {string} dateStr
 * @param {number} farmacoId
 * @param {number} doseNumero
 * @returns {string}
 */
function entryKey(dateStr, farmacoId, doseNumero) {
  return `${dateStr}-${farmacoId}-${doseNumero}`;
}

/**
 * Merge a log row into a plan entry. Mutates the entry in place.
 * The log is the source of truth: fields present on the log override defaults.
 *
 * @param {import('./types.js').PlanEntry} entry
 * @param {import('./types.js').LogAssunzione} log
 */
function mergeLogIntoEntry(entry, log) {
  entry.stato = log.stato;
  entry.ora_effettiva = log.ora_effettiva ?? null;
  entry.delta_minuti = log.delta_minuti ?? null;
  entry.ora_ricalcolata = log.ora_ricalcolata ?? null;
  entry.gap_minuti = log.gap_minuti ?? 0;
  entry.recupero_minuti = log.recupero_minuti ?? 0;
  // SENTINEL_QPERNO_SNAPSHOT -- snapshot-recupero-client (Q-PERNO-4=A).
  // The pre-recovery snapshot is a client-side session artifact: the server
  // has no such column by DDL, so a plan rebuilt from server logs lost it and
  // RecuperoModal fell back to the ALREADY-recovered time -- the dose walked
  // backwards one step per confirmation (M1) and the person read a base she
  // never chose (M3).
  // DERIVATION, not invention: under the absolute recupero semantics of
  // s.6.263 the stored total is exactly what was subtracted, so the original
  // is recovered by adding it back. It is the same computation the server
  // performs at post_recupero. addMinutesToIso recomposes the string field by
  // field, so any incoming form -- with or without seconds -- is normalised.
  // GUARD, LOAD-BEARING: derive ONLY when ora_ricalcolata is valued. Date(null)
  // does not throw, it yields the epoch, and an unguarded derivation would
  // write a 1970 timestamp into the plan.
  // gap_originale stays INERT: zero production read sites (Q-PERNO-4=A).
  entry.ora_ricalcolata_originale =
    entry.ora_ricalcolata === null
      ? null
      : addMinutesToIso(entry.ora_ricalcolata, entry.recupero_minuti);
}

/**
 * Build a multi-day plan from the given context.
 * Entries are sorted by (dateStr ASC, ora_prevista ASC).
 * Log rows that don't match any planned entry are silently ignored.
 *
 * @param {import('./types.js').PlanContext} ctx
 * @returns {import('./types.js').Plan}
 */
export function buildMultiDayPlan(ctx) {
  const { profilo, farmaci, orari, logAssunzioni, startDate, numDays } = ctx;

  // Index orari by farmaco_id for fast lookup.
  const orariByFarmaco = new Map();
  for (const o of orari) {
    if (!orariByFarmaco.has(o.farmaco_id)) orariByFarmaco.set(o.farmaco_id, []);
    orariByFarmaco.get(o.farmaco_id).push(o);
  }

  // Index log by composite key for O(1) merge.
  const logByKey = new Map();
  for (const log of logAssunzioni) {
    logByKey.set(entryKey(log.data, log.farmaco_id, log.dose_numero), log);
  }

  // P20 par.4.8 (s.6.254): per-farmaco therapy-start boundary, computed
  // ONCE per build (immutable rule on DATE(created_at), see
  // startBoundary.js). Fallback (A): rows without created_at (Dexie)
  // degrade to data_inizio 00:00 = the pre-P20 date bound already
  // enforced by isFarmacoActiveOn -> filter inert in local mode.
  // SENTINEL_P20_PLAN_TINIZIO
  const tInizioByFarmaco = new Map();
  for (const f of farmaci) {
    tInizioByFarmaco.set(f.id, computeTInizio(f.data_inizio, f.created_at));
  }

  /** @type {import('./types.js').Plan} */
  const plan = [];

  // ----- Standard branch: per-day loop (intervallo_ore <= 24h or fisso) -----
  for (let d = 0; d < numDays; d++) {
    const dateStr = addDaysLocal(startDate, d);
    for (const farmaco of farmaci) {
      if (!isFarmacoActiveOn(farmaco, dateStr)) continue;
      // Extended branch: skip here, handled in post-loop pass below (§22.42 opt B').
      if (isExtendedInterval(farmaco)) continue;
      const orariF = orariByFarmaco.get(farmaco.id) || [];
      for (const orario of orariF) {
        // F14 fisso_date flat-list per-date predicate (par.22.150): a valued
        // orario.data_specifica materializes the row ONLY on its own dateStr;
        // NULL/absent = recurring row (fisso / intervallo behaviour unchanged).
        // Direct ISO 'YYYY-MM-DD' string compare; nullish-safe (!= null) so a
        // Dexie local-mode row lacking the column is treated as recurring.
        // Model-agnostic: indifferent to Pattern S vs flat list.
        if (orario.data_specifica != null && orario.data_specifica !== dateStr) continue;
        // Decisione 1 (DST): the label is resolved ON THIS DAY, so a dose
        // planned in the skipped hour slides to the first existing time.
        // P3 containment, PER DOSE: an orario the profile cannot resolve
        // becomes a visible entry with no time and the flag set; the rest of
        // the plan is untouched. Any other error still propagates.
        let oraPrevista = null;
        let nonRisolvibile = false;
        try {
          oraPrevista = computeOraPrevistaOnDay(orario, profilo, dateStr);
        } catch (err) {
          if (!isOrarioNonRisolvibile(err)) throw err;
          nonRisolvibile = true;
        }
        // P20 par.4.8 visibility rule: occurrence generated <=>
        // T_dose >= T_inizio (ISO string compare, sub-day precision on
        // the creation day). SENTINEL_P20_PLAN_SKIP
        // Not applied to a dose without a time: absence of information
        // must never hide it (fail-safe, CLAUDE.md sez. 1).
        const tInizio = tInizioByFarmaco.get(farmaco.id);
        if (oraPrevista !== null && tInizio != null && `${dateStr}T${oraPrevista}` < tInizio) continue;
        /** @type {import('./types.js').PlanEntry} */
        const entry = {
          key: entryKey(dateStr, farmaco.id, orario.dose_numero),
          dateStr,
          farmaco,
          orario,
          ora_prevista: oraPrevista,
          ora_ricalcolata: null,
          ora_ricalcolata_originale: null,
          ora_effettiva: null,
          delta_minuti: null,
          gap_minuti: 0,
          gap_originale: 0,
          recupero_minuti: 0,
          stato: 'prevista',
          dose_prec_saltata: false,
        };
        if (nonRisolvibile) entry.orario_non_risolvibile = true;
        const log = logByKey.get(entry.key);
        if (log) mergeLogIntoEntry(entry, log);
        plan.push(entry);
      }
    }
  }

  // ----- Extended branch: post-loop pass (intervallo_ore > 24h) -----
  // Defensive attivo guard kept (cheap), data_inizio/data_fine handled inside helper.
  for (const farmaco of farmaci) {
    if (!isExtendedInterval(farmaco)) continue;
    if (!farmaco.attivo) continue;
    const orariF = orariByFarmaco.get(farmaco.id) || [];
    const occurrences = computeExtendedOccurrencesInWindow(
      farmaco,
      orariF,
      profilo,
      startDate,
      numDays,
    );
    for (const occ of occurrences) {
      /** @type {import('./types.js').PlanEntry} */
      const entry = {
        key: entryKey(occ.dateStr, farmaco.id, occ.orario.dose_numero),
        dateStr: occ.dateStr,
        farmaco,
        orario: occ.orario,
        ora_prevista: occ.oraPrevista,
        ora_ricalcolata: null,
        ora_ricalcolata_originale: null,
        ora_effettiva: null,
        delta_minuti: null,
        gap_minuti: 0,
        gap_originale: 0,
        recupero_minuti: 0,
        stato: 'prevista',
        dose_prec_saltata: false,
      };
      if (occ.nonRisolvibile) entry.orario_non_risolvibile = true;
      const log = logByKey.get(entry.key);
      if (log) mergeLogIntoEntry(entry, log);
      plan.push(entry);
    }
  }

  // Sort: dateStr ASC, then ora_prevista ASC. A dose without a time (P3
  // containment) sorts LAST within its day and never breaks the sort.
  const sortMinutes = (e) =>
    e.ora_prevista === null ? Number.POSITIVE_INFINITY : timeToMinutes(e.ora_prevista);
  plan.sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr < b.dateStr ? -1 : 1;
    return sortMinutes(a) - sortMinutes(b);
  });

  return plan;
}
