/**
 * @fileoverview Resolves scheduled time (ora_prevista) for a given OrarioBase
 * by combining its reference anchor and offset with the active Profilo.
 *
 * Extracted from planBuilder.js in Session 4b to allow reuse in recalc.js
 * (profile re-application) without introducing a dependency from recalc to
 * planBuilder. See Changelog Fase 2 par.6.16 for rationale.
 *
 * TWO FORMS (decisione 1, DST):
 *   - computeOraPrevista(orario, profilo) -> 'HH:MM', the RECURRING label:
 *     it has no calendar day, so it cannot know whether that wall time
 *     exists. It is what orari_base stores and what the Config preview shows.
 *   - computeOraPrevistaOnDay(orario, profilo, dateStr) -> 'HH:MM', the label
 *     ON A GIVEN DAY: the single seat where a dose planned inside the skipped
 *     hour of the spring transition slides to the first existing time
 *     (normalizeWallTime). Every site that materialises a (dateStr, time)
 *     pair for the plan MUST use this form.
 *
 * FAILURE IS NAMED, NOT SILENT (P3 ratified). An anchor the profile does not
 * carry, an unknown anchor, or a non-numeric offset used to end in a
 * TypeError or in the label 'NaN:NaN'. Both now throw
 * DomainError(ORARIO_NON_RISOLVIBILE). Containment is PER DOSE and belongs to
 * the callers: planBuilder, extendedFrequency, recalc and selectors catch it
 * with isOrarioNonRisolvibile and materialise the dose with ora_prevista null
 * and the flag orario_non_risolvibile, so the rest of the plan stands.
 *
 * Wrap past midnight is DECLARED, not a defect of this file: Spec 3.6 says
 * ora_prevista is HH:MM and never crosses midnight (AMB-9.D), so 'sonno'
 * 23:30 plus 60 reads '00:30' on the SAME day. Open decision, on the queue.
 *
 * Pure function: no Date.now(), no globals, no DB access.
 */

import { timeToMinutes, minutesToTime, normalizeWallTime } from '../utils/time.js';
import { DomainError } from './errors.js';

/** DomainError code raised when an orario cannot be resolved to a time. */
export const ORARIO_NON_RISOLVIBILE = 'ORARIO_NON_RISOLVIBILE';

/** Anchor name -> Profilo field carrying its 'HH:MM'. */
const ANCHOR_FIELDS = Object.freeze({
  sveglia: 'ora_sveglia',
  colazione: 'ora_colazione',
  pranzo: 'ora_pranzo',
  cena: 'ora_cena',
  sonno: 'ora_sonno',
});

const RE_HHMM = /^\d{2}:\d{2}$/;

function nonRisolvibile(dettaglio) {
  return new DomainError(
    ORARIO_NON_RISOLVIBILE,
    `Orario non risolvibile: ${dettaglio}.`
  );
}

/**
 * True for the error computeOraPrevista raises on an unresolvable orario,
 * false for anything else -- callers re-throw anything else.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isOrarioNonRisolvibile(err) {
  return err instanceof DomainError && err.code === ORARIO_NON_RISOLVIBILE;
}

/**
 * Compute the scheduled time 'HH:MM' for an orario_base entry given the active profilo.
 * Offset is in minutes from the anchor; anchor='assoluto' means offset is minutes from 00:00.
 *
 * @param {import('./types.js').OrarioBase} orario
 * @param {import('./types.js').Profilo} profilo
 * @returns {string} 'HH:MM'
 * @throws {DomainError} ORARIO_NON_RISOLVIBILE
 */
export function computeOraPrevista(orario, profilo) {
  const ancora = orario ? orario.ancora_riferimento : undefined;
  let base;
  if (ancora === 'assoluto') {
    base = 0;
  } else if (Object.prototype.hasOwnProperty.call(ANCHOR_FIELDS, ancora)) {
    const field = ANCHOR_FIELDS[ancora];
    const t = profilo ? profilo[field] : undefined;
    if (typeof t !== 'string' || !RE_HHMM.test(t)) {
      throw nonRisolvibile(`il profilo non porta ${field} per l'ancora '${ancora}'`);
    }
    base = timeToMinutes(t);
  } else {
    throw nonRisolvibile(`ancora '${String(ancora)}' sconosciuta`);
  }
  // Coercion of a numeric string is kept (measured: '30' resolved before);
  // what is refused is what resolved to NaN and printed 'NaN:NaN'.
  const raw = orario.offset_minuti;
  const offset = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
  if (!Number.isFinite(offset)) {
    throw nonRisolvibile(`offset_minuti '${String(raw)}' non e un numero`);
  }
  return minutesToTime(base + offset);
}

/**
 * The scheduled time of an orario ON A GIVEN DAY: computeOraPrevista, then
 * the DST slide of normalizeWallTime for that calendar day.
 *
 * @param {import('./types.js').OrarioBase} orario
 * @param {import('./types.js').Profilo} profilo
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {string} 'HH:MM'
 * @throws {DomainError} ORARIO_NON_RISOLVIBILE
 */
export function computeOraPrevistaOnDay(orario, profilo, dateStr) {
  return normalizeWallTime(dateStr, computeOraPrevista(orario, profilo));
}
