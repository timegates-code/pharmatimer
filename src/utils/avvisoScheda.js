/**
 * @fileoverview CS-5.3-bis parte 2 -- junction and formatters for the
 * presa-in-conflitto card. Seat ratified by Q-TRAMA-3=A.
 *
 * WHY THIS MODULE EXISTS. `avvisiStore.js` persists RAW facts and `testi.js`
 * consumes DISPLAY strings, and the two do not meet: the store writes
 * `farmaco_nome` / `dose_numero` / `data` / `ora_tocco`, while
 * `testoAvvisoConflitto` expects `farmacoNome` / `doseNumero` / `dataLabel` /
 * `oraLabel`, the last two already formatted. Both modules were ratified
 * separately and neither is at fault: the junction is the missing piece.
 *
 * WHY IT IS PURE AND SEPARATE. The junction must tell a COMPLETE record from
 * an UNREADABLE one, and since Q-TRAMA-4=A that distinction carries M2:
 * `salvaAvviso` validates `data` and `ora_tocco` as non-blank strings ONLY,
 * so a malformed value passes validation, authorises the drop, and then fails
 * to format at read time. If the reader showed nothing, the gesture would be
 * dropped with no visible notice. In a pure module that branch is exercised
 * by mutation without mounting React.
 *
 * NO try/catch, DELIBERATELY. Every step is total by construction, so there is
 * nothing to catch -- and a catch here would swallow the very mutations that
 * must turn the gates red. That is voce 142, one session old, avoided instead
 * of repeated.
 *
 * FORMATTING LIVES HERE. Measured: `testi.js` :12-16 declares it carries no
 * formatter; `time.js` exports only minute arithmetic and duration labels;
 * `toLocaleTimeString` has ZERO occurrences in the tree. The only Italian date
 * labels are the relative ones in `uiState.js` :187 and :208, unusable here
 * for two independent reasons -- they render "Oggi - <weekday> <day month>",
 * which inside the pinned sentence reads "dose 2 del Oggi - ...", and a
 * relative label turns false when the day changes, while this notice never
 * expires (14.5 p.4, Q-LETTO-4=A). Absolute labels are Q-TRAMA-2=A, amended
 * in session to drop the weekday: after "del", "lunedi 28 luglio" states a
 * habit and not a date.
 *
 * SENTINEL_QTRAMA_SCHEDA
 */

import {
  testoAvvisoConflitto,
  testoAvvisoDegradato,
  testoAvvisoIntervalloMinimo,
  testoAvvisoIntervalloMinimoDegradato,
} from './testi.js';
import { formatDuration } from './time.js';

/**
 * Decisione 2 -- the motivo of the "due dosi molto vicine" notice. A LITERAL
 * and not an import: `src/utils/` stays pure (no edge towards `src/data/`),
 * and avvisoScheda.test.js pins this literal equal to
 * MOTIVI_AVVISO.INTERVALLO_MINIMO, so the two cannot drift in silence.
 */
export const MOTIVO_INTERVALLO_MINIMO = 'INTERVALLO_MINIMO';

/**
 * Frozen vocabulary of junction outcomes. APPEND-ONLY, same discipline as
 * OUTBOX_OPS, PARK_REASONS and MOTIVI_AVVISO.
 */
export const ESITI_SCHEDA = Object.freeze({
  COMPLETA: 'completa',
  DEGRADATA: 'degradata',
});

/** `data` as frozen into the outbox element: a bare calendar day. */
const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `ora_tocco` as frozen at the tap: ISO 8601 WITH a clock part. */
const RE_ISTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Absolute Italian date label: "28 luglio 2026". Never throws.
 *
 * The year is deliberate: this notice has no expiry, so it can be read after a
 * new year has begun, and an ambiguous date on this surface would be M3.
 *
 * @param {unknown} dateStr 'YYYY-MM-DD'
 * @returns {string|null} null when the value cannot be trusted
 */
export function formatDataAvviso(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const grezzo = dateStr.trim();
  const m = RE_DATA.exec(grezzo);
  if (!m) return null;

  // Noon avoids TZ-driven day shifts, the same guard uiState.js already uses.
  const d = new Date(grezzo + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;

  // Round-trip. JS rolls 2026-02-30 over to March 2, and a rolled date would
  // name a day the person never touched, which is M3 on the surface.
  if (d.getFullYear() !== Number(m[1])) return null;
  if (d.getMonth() + 1 !== Number(m[2])) return null;
  if (d.getDate() !== Number(m[3])) return null;

  const etichetta = d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (typeof etichetta !== 'string' || etichetta.trim() === '') return null;
  return etichetta;
}

/**
 * Clock label "HH:MM" for the instant of the TAP. Never throws.
 *
 * A date with no clock part is REFUSED rather than rendered as 00:00: a
 * midnight that nobody touched would be a false tap time, which is M3. The
 * label is built from the PARSED instant and never from the current one, and
 * it is padded by hand so the result does not depend on the ICU clock format.
 *
 * @param {unknown} istante ISO 8601 with a clock part
 * @returns {string|null}
 */
export function formatOraAvviso(istante) {
  if (typeof istante !== 'string') return null;
  const grezzo = istante.trim();
  if (!RE_ISTANTE.test(grezzo)) return null;
  const d = new Date(grezzo);
  if (Number.isNaN(d.getTime())) return null;
  const ore = String(d.getHours()).padStart(2, '0');
  const minuti = String(d.getMinutes()).padStart(2, '0');
  return ore + ':' + minuti;
}

/**
 * Duration label for the "due dosi molto vicine" card. Never throws.
 *
 * @param {unknown} minuti non-negative integer minutes
 * @returns {string|null} null when the value cannot be trusted
 */
export function formatDurataAvviso(minuti) {
  if (!Number.isInteger(minuti) || minuti < 0) return null;
  return formatDuration(minuti);
}

/**
 * The "due dosi molto vicine" card from one persisted notice (decisione 2).
 * The numbers live in `record.dettagli`; the time shown is the RECORDED
 * dose time (`ora_effettiva`), never the tap: a missing one degrades the card
 * instead of naming a time nobody declared (M3).
 */
function componiSchedaIntervalloMinimo(r) {
  const d = r.dettagli && typeof r.dettagli === 'object' ? r.dettagli : {};
  const testi = testoAvvisoIntervalloMinimo({
    farmacoNome: r.farmaco_nome,
    doseNumero: r.dose_numero,
    dataLabel: formatDataAvviso(r.data),
    oraLabel: formatOraAvviso(d.ora_effettiva),
    lato: d.lato,
    minutiLabel: formatDurataAvviso(d.minuti_dalla_vicina),
    minimoLabel: formatDurataAvviso(d.intervallo_minimo_minuti),
  });
  if (testi) {
    return Object.freeze({ esito: ESITI_SCHEDA.COMPLETA, testi });
  }
  return Object.freeze({
    esito: ESITI_SCHEDA.DEGRADATA,
    testi: testoAvvisoIntervalloMinimoDegradato(),
  });
}

/**
 * Compose the card for ONE persisted notice. NEVER returns null, NEVER throws.
 *
 * Q-TRAMA-5=A: the contract is one record, never a list. Selecting which one
 * and remounting after "Ho letto" are acts of the Gate, which is P-3.
 *
 * Branch on `motivo` (decisione 2): INTERVALLO_MINIMO has its own card; every
 * other record -- CONFLITTO, and any motivo this junction does not know --
 * takes the conflict path, complete or degraded, which is the pre-existing
 * surface. Never silent.
 *
 * @param {unknown} record one entry from `elencaAvvisi()`
 * @returns {{esito: string, testi: object}}
 */
export function componiScheda(record) {
  const r = record && typeof record === 'object' ? record : {};

  if (r.motivo === MOTIVO_INTERVALLO_MINIMO) {
    return componiSchedaIntervalloMinimo(r);
  }

  const testi = testoAvvisoConflitto({
    farmacoNome: r.farmaco_nome,
    doseNumero: r.dose_numero,
    dataLabel: formatDataAvviso(r.data),
    oraLabel: formatOraAvviso(r.ora_tocco),
  });

  if (testi) {
    return Object.freeze({ esito: ESITI_SCHEDA.COMPLETA, testi });
  }
  return Object.freeze({
    esito: ESITI_SCHEDA.DEGRADATA,
    testi: testoAvvisoDegradato(),
  });
}
