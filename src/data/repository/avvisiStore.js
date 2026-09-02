/**
 * @fileoverview CS-5.3-bis -- durable seat of the presa-in-conflitto notice.
 *
 * Seat ratified by Q-LETTO-6=A: it sits beside the guardian because the
 * data layer ALREADY persists to localStorage in this very folder
 * (`SyncRepository.js` :43 :65 :76, mirror freshness, Q4=A). No new direction
 * is opened in the import graph: the guardian imports a sibling, and the React
 * Gate reads it along the direction `App.jsx` :17 already travels.
 *
 * WHY localStorage AND NOT DEXIE (Q-LETTO-1=A). The notice is the M2
 * compensation for dropping the element, so it cannot be LESS durable than the
 * queue it replaces. Finding #10 -- registered, and reconfirmed on both WebKit
 * and Chromium -- observed IndexedDB not surviving reloads on mobile while
 * localStorage did (`db.js` :245-250). Putting the compensation on the very
 * substrate whose loss it must survive would defeat it.
 *
 * ORDER, NOT NEGOTIABLE. The caller persists the notice BEFORE `outboxRemove`.
 * The only window that can then open is "notice without drop", which is benign:
 * the element stays queued, gets redelivered, and the targa makes the server
 * dedupe it. The reverse order loses the gesture.
 *
 * FAILURE IS NOT SILENT. `salvaAvviso` NEVER throws and returns a boolean,
 * deliberately: a throw from inside the guardian's catch would be routed to
 * the INTERNAL class and would spend an attempt (`_onInternalException`),
 * which is the wrong outcome. `false` means the caller MUST NOT drop -- it
 * parks, which is today's behaviour and is clinically safe (Q-LETTO-1=A,
 * extended to a null farmaco by Q-LETTO-7=A).
 *
 * ONE KEY PER TARGA (Q-LETTO-4=A). Idempotent by construction: a redelivery
 * that earns the same 409 rewrites the same key instead of appending a
 * duplicate -- the same mechanism by which the targa dedupes server-side. A
 * corrupt entry loses exactly ONE notice, never all of them. NO capacity cap
 * and NO expiry, for the reason Spec 14.3 forbids both on the queue: a notice
 * that disappears on its own is the definition of a silent discard.
 *
 * SENTINEL_QLETTO_AVVISI_STORE
 */

/** Key namespace. Measured free against the four keys already in use. */
const AVVISO_KEY_PREFIX = 'pharmatimer.avviso.';

/**
 * Frozen vocabulary of notice reasons. APPEND-ONLY, same discipline as
 * OUTBOX_OPS and PARK_REASONS: a reason already written into a pilot's
 * localStorage must stay explainable forever.
 *
 * Deliberately NOT reusing PARK_REASONS.CONFLITTO_VERO: that vocabulary names
 * why an element is PARKED, and this element was DROPPED. A park label on a
 * dropped gesture would be a false explanation, which is the very defect
 * Q-QQUIN-2=A removed when it split the catch-all.
 */
export const MOTIVI_AVVISO = Object.freeze({
  CONFLITTO: 'CONFLITTO',
  // Decisione 2 -- the presa IS registered, but too close to another presa
  // of the same farmaco: the server said so on the 201 (`avviso`), in real
  // minutes. Not a drop and not a park: the registration went through. The
  // details travel in the optional `dettagli` of the record.
  INTERVALLO_MINIMO: 'INTERVALLO_MINIMO',
});

/** Required facts. Missing any of them means the record cannot be composed. */
const CAMPI_OBBLIGATORI = Object.freeze([
  'client_op_id',
  'farmaco_nome',
  'dose_numero',
  'data',
  'ora_tocco',
  'op',
  'motivo',
]);

/**
 * @param {string} clientOpId
 * @returns {string} the localStorage key of one notice.
 */
export function avvisoKey(clientOpId) {
  return `${AVVISO_KEY_PREFIX}${clientOpId}`;
}

/**
 * Reach localStorage without ever throwing. Returns null when the store is
 * unavailable (Safari private mode, disabled storage, non-browser env).
 * @returns {Storage|null}
 */
function magazzino() {
  try {
    const ls = globalThis.localStorage;
    if (!ls || typeof ls.getItem !== 'function') return null;
    return ls;
  } catch {
    return null;
  }
}

/**
 * @param {any} fatti
 * @returns {boolean} true when every required fact is present and usable.
 */
function fattiCompleti(fatti) {
  if (!fatti || typeof fatti !== 'object') return false;
  for (const campo of CAMPI_OBBLIGATORI) {
    const v = fatti[campo];
    if (campo === 'dose_numero') {
      if (!Number.isInteger(v) || v < 1) return false;
      continue;
    }
    if (typeof v !== 'string' || v.trim() === '') return false;
  }
  return true;
}

/**
 * Persist ONE notice. Never throws.
 *
 * Verification is a READ-BACK, not the absence of a throw: `setItem` can fail
 * on quota in ways that leave the value absent, and this write is the thing
 * that authorises a drop. "It did not throw" is not "it is there".
 *
 * @param {object} fatti frozen facts; see CAMPI_OBBLIGATORI. An optional
 *   plain-object `dettagli` is copied into the record as is (decisione 2):
 *   the junction reads it per motivo and degrades when it cannot.
 * @param {() => string} [now] injected for deterministic tests
 * @returns {boolean} true only if the record is readable back, byte-equal
 */
export function salvaAvviso(fatti, now = () => new Date().toISOString()) {
  if (!fattiCompleti(fatti)) return false;
  const ls = magazzino();
  if (!ls) return false;

  const record = {
    client_op_id: fatti.client_op_id,
    farmaco_nome: fatti.farmaco_nome,
    dose_numero: fatti.dose_numero,
    data: fatti.data,
    ora_tocco: fatti.ora_tocco,
    op: fatti.op,
    motivo: fatti.motivo,
    creato_at: now(),
  };
  if (
    fatti.dettagli &&
    typeof fatti.dettagli === 'object' &&
    !Array.isArray(fatti.dettagli)
  ) {
    record.dettagli = { ...fatti.dettagli };
  }

  let serializzato;
  try {
    serializzato = JSON.stringify(record);
  } catch {
    return false;
  }

  try {
    ls.setItem(avvisoKey(record.client_op_id), serializzato);
  } catch {
    return false;
  }

  try {
    return ls.getItem(avvisoKey(record.client_op_id)) === serializzato;
  } catch {
    return false;
  }
}

/**
 * List every readable notice, oldest first. Never throws.
 *
 * A corrupt entry is SKIPPED, not fatal: Q-LETTO-4=A chose one key per targa
 * precisely so that a single parse failure costs one notice and not all of
 * them. Ordering is by `creato_at` and then by key, so it is total and stable
 * even when two notices share a timestamp.
 *
 * @returns {object[]}
 */
export function elencaAvvisi() {
  const ls = magazzino();
  if (!ls) return [];

  const chiavi = [];
  try {
    for (let i = 0; i < ls.length; i += 1) {
      const k = ls.key(i);
      if (typeof k === 'string' && k.startsWith(AVVISO_KEY_PREFIX)) {
        chiavi.push(k);
      }
    }
  } catch {
    return [];
  }

  const avvisi = [];
  for (const k of chiavi) {
    let grezzo = null;
    try {
      grezzo = ls.getItem(k);
    } catch {
      continue;
    }
    if (typeof grezzo !== 'string') continue;
    let record = null;
    try {
      record = JSON.parse(grezzo);
    } catch {
      continue;
    }
    if (!record || typeof record !== 'object') continue;
    if (typeof record.client_op_id !== 'string') continue;
    avvisi.push(record);
  }

  avvisi.sort((a, b) => {
    const ta = typeof a.creato_at === 'string' ? a.creato_at : '';
    const tb = typeof b.creato_at === 'string' ? b.creato_at : '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.client_op_id < b.client_op_id ? -1 : 1;
  });
  return avvisi;
}

/**
 * Remove ONE notice, on the person's explicit "Ho letto". Never throws.
 *
 * Removal happens ONLY here, driven by a read. Nothing else expires a notice:
 * that is the difference between "resta finche letta" (14.5 p.4) and a silent
 * discard.
 *
 * @param {string} clientOpId
 * @returns {boolean} true when the key is absent afterwards
 */
export function rimuoviAvviso(clientOpId) {
  if (typeof clientOpId !== 'string' || clientOpId.trim() === '') return false;
  const ls = magazzino();
  if (!ls) return false;
  try {
    ls.removeItem(avvisoKey(clientOpId));
  } catch {
    return false;
  }
  try {
    return ls.getItem(avvisoKey(clientOpId)) === null;
  } catch {
    return false;
  }
}
