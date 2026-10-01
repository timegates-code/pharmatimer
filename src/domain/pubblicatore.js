/**
 * @fileoverview The calendar the phone publishes to the Mini: the Web Push
 * reminder channel, branch A, step 3 of the client (STATO_CORRENTE.md, "Il
 * commit B del client"). Decisions 8, 11, 12 and 16; the text is decision 32
 * (promemoria.js). Pure: no clock, no I/O. The caller passes the plan, the
 * active profile, the day the plan was built for, and the tolerance it read
 * from /api/push/stato in the same cycle: never a copy of it (condition of
 * decision 12).
 *
 * - Entries: every entry of the plan the app shows (ieri, oggi, domani) in
 *   'prevista' or 'ricalcolata' with a resolved time, chosen by effective
 *   instant and never by `dateStr === today`, so a dose of yesterday
 *   recalculated into today goes in (decision 8). A dose closed on the phone
 *   leaves the calendar, and the server does not send it.
 * - Key: (farmaco_id, data, dose_numero) as buildLogWrite projects it
 *   (recalc.js), so the planner re-reads the log row of the same slot. `data`
 *   is the entry's dateStr, never the date of its instant.
 * - Instant: istanteDose, the page timers' formula (promemoria.js).
 * - ora_ricalcolata: the entry's own value, whole-second and never
 *   converted, or empty: decision 11 compares it with the log by equality.
 * - Horizon: the midnight after the last day of the plan.
 * - End notice (decision 12): the last entry plus the tolerance; when its
 *   window touches the sleep of the active profile (ora_sonno to
 *   ora_sveglia) it moves to the wake-up; `entro` is the notice plus the
 *   tolerance. Without entries it starts from the horizon, with the same
 *   sleep rule (step 3 of 2026-10-01). Profile times that do not read leave
 *   the notice where it is: missing data never suppresses.
 */

import { addDays, localDateStr, wallToInstant } from '../utils/time.js';
import { PLAN_DAYS_AFTER } from './constants.js';
import { istanteDose, testoDose } from './promemoria.js';

const MINUTO_MS = 60_000;
const FORMA_PARETE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const FORMA_ORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORMA_GIORNO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `ora_ricalcolata` as the log column holds it: wall clock, whole second,
 * 'YYYY-MM-DDTHH:MM:SS'; null when empty or unreadable.
 * @param {unknown} valore 'YYYY-MM-DDTHH:MM' from the phone, or with seconds from the server
 * @returns {string|null}
 */
export function oraRicalcolataAlSecondo(valore) {
  if (valore === null || valore === undefined || valore === '') return null;
  const parti = FORMA_PARETE.exec(String(valore));
  if (parti === null) return null;
  return `${parti[1]}T${parti[2]}:${parti[3]}:${parti[4] ?? '00'}`;
}

function pubblicabile(entry) {
  if (!entry || (entry.stato !== 'prevista' && entry.stato !== 'ricalcolata')) return false;
  if (entry.orario_non_risolvibile === true) return false;
  return entry.farmaco != null && entry.orario != null;
}

/**
 * The entries of the calendar, ordered by instant.
 * @param {import('./types.js').Plan} plan
 */
export function vociDelCalendario(plan) {
  const viste = new Set();
  const voci = [];
  for (const entry of plan ?? []) {
    if (!pubblicabile(entry)) continue;
    const istante = istanteDose(entry);
    if (!Number.isFinite(istante)) continue;
    const chiave = `${entry.farmaco.id}|${entry.dateStr}|${entry.orario.dose_numero}`;
    if (viste.has(chiave)) continue;
    viste.add(chiave);
    const { titolo, corpo } = testoDose(entry, entry.farmaco);
    voci.push({
      farmaco_id: entry.farmaco.id,
      data: entry.dateStr,
      dose_numero: entry.orario.dose_numero,
      istante_ms: istante,
      ora_ricalcolata: oraRicalcolataAlSecondo(entry.ora_ricalcolata),
      titolo,
      corpo,
    });
  }
  return voci.sort(
    (a, b) => a.istante_ms - b.istante_ms || a.farmaco_id - b.farmaco_id || a.dose_numero - b.dose_numero
  );
}

/**
 * The end of the horizon: the midnight after the last day of the plan.
 * @param {string} oggi 'YYYY-MM-DD', the day the plan was built for
 */
export function fineOrizzonte(oggi) {
  if (typeof oggi !== 'string' || !FORMA_GIORNO.test(oggi)) {
    throw new Error(`giorno del piano non valido: ${String(oggi)}`);
  }
  return wallToInstant(addDays(oggi, PLAN_DAYS_AFTER + 1), '00:00').getTime();
}

/**
 * The notice moved out of the sleep: when [avviso, avviso + finestra) touches
 * a sleep of the profile, the wake-up that ends it.
 * @param {number} avvisoMs
 * @param {number} finestraMs
 * @param {{ora_sonno?: string, ora_sveglia?: string}|null} profilo
 */
export function fuoriDalSonno(avvisoMs, finestraMs, profilo) {
  const sonno = profilo?.ora_sonno;
  const sveglia = profilo?.ora_sveglia;
  if (!FORMA_ORA.test(sonno ?? '') || !FORMA_ORA.test(sveglia ?? '') || sonno === sveglia) return avvisoMs;
  const giorno = localDateStr(new Date(avvisoMs));
  for (const d of [addDays(giorno, -1), giorno, addDays(giorno, 1)]) {
    const inizio = wallToInstant(d, sonno).getTime();
    const fine = wallToInstant(sonno < sveglia ? d : addDays(d, 1), sveglia).getTime();
    if (avvisoMs < fine && avvisoMs + finestraMs > inizio) return fine;
  }
  return avvisoMs;
}

/**
 * The publication of PUT /api/push/calendario, without the device_id.
 * @param {{plan: import('./types.js').Plan, profilo: object|null, oggi: string, tolleranzaMin: number}} ingresso
 */
export function componiCalendario({ plan, profilo, oggi, tolleranzaMin }) {
  if (!Number.isInteger(tolleranzaMin) || tolleranzaMin <= 0) {
    throw new Error(`tolleranza non valida: ${String(tolleranzaMin)}`);
  }
  const tolleranzaMs = tolleranzaMin * MINUTO_MS;
  const voci = vociDelCalendario(plan);
  const orizzonte = fineOrizzonte(oggi);
  const base = voci.length > 0 ? voci[voci.length - 1].istante_ms + tolleranzaMs : orizzonte;
  const avviso = fuoriDalSonno(base, tolleranzaMs, profilo);
  return {
    orizzonte_fino_ms: orizzonte,
    avviso_fine_ms: avviso,
    avviso_fine_entro_ms: avviso + tolleranzaMs,
    voci,
  };
}
