/**
 * @fileoverview P20 -- therapy-start boundary (T_inizio), Spec v1.16 par.4.8
 * (emended s.6.254, par.22.198-quater; sub-Q-P20=(A) par.22.198-undecies).
 *
 * Rule (3 branches, immutable, on DATE(created_at), never CURDATE):
 *   data_inizio > DATE(created_at) -> T_inizio = data_inizio 'T00:00'
 *   data_inizio = DATE(created_at) -> T_inizio = created_at (with time)
 *   data_inizio < DATE(created_at) -> T_inizio = data_inizio 'T00:00'
 * Visibility: occurrence (dateStr, ora_prevista) generated <=>
 *   `${dateStr}T${ora_prevista}` >= T_inizio (ISO lexicographic compare;
 *   a created_at carrying seconds sorts AFTER the same minute, so a dose
 *   at the exact creation minute is excluded, by design).
 *
 * Fallback (A) sub-Q-P20: created_at missing/malformed (Dexie local rows)
 * -> T_inizio = data_inizio 'T00:00' -> the filter degrades to the pre-P20
 * date-only bound (explicit, documented, zero risk). data_inizio missing
 * -> boundary = created_at alone; both missing -> null (filter inert).
 *
 * Timezone invariant (measured par.22.198-duodecies): MySQL session tz =
 * SYSTEM = CEST on dev AND prod, so created_at travels as family
 * wall-clock (naive ISO, no suffix) end-to-end. Re-evaluate only if the
 * server ever changes timezone.
 *
 * Pure module: no Date.now(), no DB, no globals.
 * SENTINEL_P20_STARTBOUNDARY
 */

import { firstKOnOrAfterIso, occurrenceDateAt } from './extendedStride.js';
import { normalizeWallTime } from '../utils/time.js';

const ISO_MIN_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Add n days to 'YYYY-MM-DD' (noon anchor, DST-safe). */
function addDaysIso(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * Compute T_inizio for a farmaco (3-branch rule + fallback (A)).
 *
 * @param {string|null|undefined} dataInizio 'YYYY-MM-DD'
 * @param {string|null|undefined} createdAt naive ISO 'YYYY-MM-DDTHH:MM[:SS]'
 * @returns {string|null} ISO boundary, or null (filter inert)
 */
export function computeTInizio(dataInizio, createdAt) {
  const ca =
    typeof createdAt === 'string' && ISO_MIN_RE.test(createdAt)
      ? createdAt
      : null;
  if (!dataInizio) return ca;
  if (ca && dataInizio === ca.slice(0, 10)) return ca;
  return `${dataInizio}T00:00`;
}

/**
 * R4 (deferito 44): first occurrence { dateStr, hhmm } with
 * `${dateStr}T${hhmm}` >= tInizio, per tipo_frequenza. Null when none
 * exists (caller omits the toast).
 *
 * `orari` = normalized payload rows carrying ora_prevista 'HH:MM'
 * (BUG-k s.6.246 snapshot) and, for fisso_date, data_specifica.
 *
 * The returned hhmm is the label ON ITS DAY (decisione 1, DST): the
 * comparisons with tInizio run on the recurring label, the announced time
 * passes through normalizeWallTime, like every plan label.
 *
 * @returns {{dateStr: string, hhmm: string} | null}
 */
export function firstDoseAfterTInizio({
  tInizio, tipo, dataInizio, dataFine, intervalloOre, orari,
}) {
  const rows = Array.isArray(orari)
    ? orari.filter(
        (o) =>
          o &&
          typeof o.ora_prevista === 'string' &&
          /^\d{2}:\d{2}$/.test(o.ora_prevista),
      )
    : [];
  if (rows.length === 0) return null;

  if (tipo === 'fisso_date') {
    const pairs = rows
      .filter((o) => typeof o.data_specifica === 'string' && o.data_specifica)
      .map((o) => ({ dateStr: o.data_specifica, hhmm: o.ora_prevista }))
      .sort((a, b) =>
        `${a.dateStr}T${a.hhmm}`.localeCompare(`${b.dateStr}T${b.hhmm}`),
      );
    for (const p of pairs) {
      if (tInizio == null || `${p.dateStr}T${p.hhmm}` >= tInizio) {
        return { dateStr: p.dateStr, hhmm: normalizeWallTime(p.dateStr, p.hhmm) };
      }
    }
    return null;
  }

  const isExt =
    tipo === 'intervallo' &&
    typeof intervalloOre === 'number' &&
    intervalloOre > 24;

  if (isExt) {
    // Cadenza: CANONE UNICO, lo stesso che genera il piano (Q-P15-7=(A)).
    // Il mirroring col generatore non e piu un contratto dichiarato in un
    // commento: e la stessa funzione. SENTINEL_P15A_SB_CANONE
    if (!dataInizio) return null;
    const hhmm = rows[0].ora_prevista;
    const k =
      tInizio != null
        ? firstKOnOrAfterIso(dataInizio, hhmm, intervalloOre, tInizio)
        : 0;
    const dateStr = occurrenceDateAt(dataInizio, hhmm, intervalloOre, k);
    if (dataFine && dateStr > dataFine) return null;
    return { dateStr, hhmm: normalizeWallTime(dateStr, hhmm) };
  }

  // Standard daily recurrence (fisso / intervallo <= 24h). Chronological
  // minimum, NOT row order (R4: the toast announces the first occurrence).
  const hours = rows.map((o) => o.ora_prevista).sort();
  const day0 = tInizio != null ? tInizio.slice(0, 10) : dataInizio;
  if (!day0) return null;
  for (const hh of hours) {
    if (tInizio == null || `${day0}T${hh}` >= tInizio) {
      if (dataFine && day0 > dataFine) return null;
      return { dateStr: day0, hhmm: normalizeWallTime(day0, hh) };
    }
  }
  const day1 = addDaysIso(day0, 1);
  if (dataFine && day1 > dataFine) return null;
  return { dateStr: day1, hhmm: normalizeWallTime(day1, hours[0]) };
}
