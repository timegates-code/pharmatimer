/**
 * @fileoverview The state of the reminder channel ad app chiusa, as the
 * phone tells it: step 4 of the client (STATO_CORRENTE.md, "Il commit B del
 * client"). Decision 9 and its condition (an old heartbeat reaches the
 * patient in the app), decision 33 B (the threshold). Pure: the caller passes
 * the last reading of GET /api/push/stato with the clocks of its moment, the
 * clocks of now, and the local record of the last publication.
 *
 * Four outcomes, and the text says which (Roberto, 2026-10-01):
 * - non_attivi: we KNOW the reminders will not arrive. The channel is off on
 *   the server, the planner never ran, its last pass did not end well, or
 *   this phone is not subscribed. Said plainly, the reason in Impostazioni.
 * - non_verificati: we do NOT know. The heartbeat is older than the
 *   threshold, or the state never read.
 * - non_aggiornati: the last publication did not reach the server, which
 *   keeps the calendar it had (Roberto's addition to step 4).
 * - attivi: none of the above.
 * In this order: what we know, then what we do not know, then the stale
 * calendar.
 *
 * Never an old OK: the age of the heartbeat is eta_ms, measured on the
 * server clock, plus the time elapsed on the phone since the request left,
 * the larger of the monotonic and the wall clock. A jump of either clock can
 * only age it; a value that does not read is not an OK.
 */

/** Decision 33 B (2026-10-01): five passes of the planner, one a minute. */
export const SOGLIA_BATTITO_MS = 5 * 60_000;

export const ESITI_STATO_CANALE = Object.freeze({
  ATTIVI: 'attivi',
  NON_ATTIVI: 'non_attivi',
  NON_VERIFICATI: 'non_verificati',
  NON_AGGIORNATI: 'non_aggiornati',
});

export const PERCHE_STATO_CANALE = Object.freeze({
  CANALE_SPENTO: 'canale_spento',
  PASSATA_MAI_PARTITA: 'passata_mai_partita',
  ESITO_PASSATA: 'esito_passata',
  NON_ISCRITTO: 'non_iscritto',
  BATTITO_VECCHIO: 'battito_vecchio',
  STATO_NON_LETTO: 'stato_non_letto',
  PUBBLICAZIONE: 'pubblicazione',
});

const E = ESITI_STATO_CANALE;
const P = PERCHE_STATO_CANALE;

function esito(stato, perche = null, dalleMs = null) {
  return { esito: stato, perche, dalleMs };
}

/**
 * Time elapsed on the phone since the reading: the larger of the two clocks.
 * @param {{lettoMono: number, lettoMs: number}} lettura
 * @param {{mono: number, ms: number}} adesso
 * @returns {number} ms, NaN when neither clock reads
 */
export function trascorso(lettura, adesso) {
  const valori = [adesso?.mono - lettura?.lettoMono, adesso?.ms - lettura?.lettoMs].filter(Number.isFinite);
  return valori.length === 0 ? Number.NaN : Math.max(0, ...valori);
}

/**
 * @param {{
 *   lettura: {risposta: object, lettoMono: number, lettoMs: number, deviceId: string|null}|null,
 *   letturaFallita?: boolean,
 *   adesso: {mono: number, ms: number},
 *   pubblicazione?: {esito: string}|null,
 * }} ingresso
 * @returns {{esito: string, perche: string|null, dalleMs: number|null}|null}
 *   null while nothing is known yet: no reading and no failed one.
 */
export function valutaCanale({ lettura, letturaFallita = false, adesso, pubblicazione = null }) {
  const risposta = lettura?.risposta ?? null;
  if (risposta === null) return letturaFallita ? esito(E.NON_VERIFICATI, P.STATO_NON_LETTO) : null;
  if (risposta.canale?.attivo !== true) return esito(E.NON_ATTIVI, P.CANALE_SPENTO);
  const battito = risposta.pianificatore ?? null;
  if (battito === null) return esito(E.NON_ATTIVI, P.PASSATA_MAI_PARTITA);
  if (battito.esito !== 'ok') return esito(E.NON_ATTIVI, P.ESITO_PASSATA);
  const deviceId = lettura.deviceId ?? null;
  const iscritto = deviceId !== null
    && (risposta.iscrizioni ?? []).some((i) => i.device_id === deviceId && i.attiva === true);
  if (!iscritto) return esito(E.NON_ATTIVI, P.NON_ISCRITTO);
  const eta = battito.eta_ms + trascorso(lettura, adesso);
  if (!(eta <= SOGLIA_BATTITO_MS)) return esito(E.NON_VERIFICATI, P.BATTITO_VECCHIO, battito.ultima_passata_ms ?? null);
  if (pubblicazione?.esito === 'non_pubblicata') {
    return esito(E.NON_AGGIORNATI, P.PUBBLICAZIONE, risposta.pubblicazione?.pubblicata_ms ?? null);
  }
  return esito(E.ATTIVI, null, battito.ultima_passata_ms ?? null);
}
