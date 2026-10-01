// src/services/canalePush.js
//
// PharmaTimer -- the Web Push reminder channel on the phone, branch A: the
// subscription and its renewal. Step 2 of the client (STATO_CORRENTE.md, "Il
// commit B del client"); decisions 2, 14 and 15; ratification A of
// 2026-10-01 on the order inside the toggle's tap.
//
// The platform side: the service worker registration, the question to the
// active worker, PushManager's subscribe and unsubscribe. The network goes
// through src/data/repository/canale.js. Nothing here throws: every outcome
// becomes a record {esito, motivo, dettaglio} for the state, and the app
// opens whatever the channel does (decision 15).
//
// The rules, each pinned by canalePush.test.js:
// - API mode only (shouldUseApiRepo, the single source): in local mode no
//   call to /api/push and no subscription.
// - A subscription is made, or confirmed, only when the active worker
//   answers the question of public/sw-push.js: a worker that does not show
//   pushes gets the subscription extinguished by iOS (S11).
// - Without the key there is no subscription, and the record says so.
// - In the toggle's tap subscribe() is the first act and asks for the
//   permission itself: the path S1 measured on the pilot's iPhone
//   (sonda-iphone-esiti.md :73-79). Registration, key and the worker's answer
//   are read before the tap, by prepara().
// - At every opening and return to the foreground (rinnova): with the toggle
//   on and the permission granted, a subscription missing or bound to another
//   key is made again, then the PUT confirms it. A subscription that does not
//   say its key is kept and confirmed: no new endpoint at every opening. With
//   the toggle off or the permission not granted, a subscription still on the
//   phone is undone and the server told (unsubscribe, then DELETE).
// - One operation at a time. A renewal asked while an equal one waits is that
//   renewal.
//
// The calendar (step 3; decisions 8, 11, 12 and 16): pubblica() takes the
// state React has committed (the effect of AppContext, ratification A of
// 2026-10-01) and publishes the plan through domain/pubblicatore.js:
// - one publication at a time; while one waits, the latest state asked wins;
// - content equal to the last publication that went through is not published
//   again (Q-SYNC), without even reading /api/push/stato; the memory is in
//   this process, so the first publication of a session always goes;
// - the tolerance is read from /api/push/stato in the same cycle, never kept;
// - an error is not retried here: the record says so, and the next change
//   of the state, or the next return to the foreground, tries again.
//
// Not measured, declared: on iOS, a subscribe() outside a gesture, which the
// renewal needs when the subscription has to be made again. It is a step of
// the iPhone test of the deploy session.

import { shouldUseApiRepo } from '../data/repository/index.js';
import * as reteCanale from '../data/repository/canale.js';
import { componiCalendario, fineOrizzonte, vociDelCalendario } from '../domain/pubblicatore.js';

// The question public/sw-push.js answers, and the protocol version of its
// answer. The test asks the real file.
export const DOMANDA_PRONTO = 'pt-push-pronto';
export const VERSIONE_PROTOCOLLO = 1;

// How long the active registration and the worker's answer may take.
// Conventional: nothing waits on them but the channel itself.
const ATTESA_REGISTRAZIONE_MS = 5000;
const ATTESA_WORKER_MS = 2000;

export const ESITI_CANALE = Object.freeze({
  ATTIVA: 'attiva', // subscribed, and confirmed by the server
  NON_ATTIVA: 'non_attiva', // wanted on and not on: motivo says why
  SPENTA: 'spenta', // toggle off: no subscription, by choice
});

export const MOTIVI_CANALE = Object.freeze({
  NON_SUPPORTATO: 'non_supportato', // no service worker or PushManager
  WORKER_ASSENTE: 'worker_assente', // no active registration
  WORKER_NON_PRONTO: 'worker_non_pronto', // the active worker did not answer
  CHIAVE: 'chiave', // the key could not be read
  CHIAVE_NON_VALIDA: 'chiave_non_valida', // the key read is not a P-256 point
  PREPARAZIONE: 'preparazione', // the tap came before the preparation ended
  PERMESSO: 'permesso', // notifications not granted
  DEVICE_ID: 'device_id', // no stable id for this phone
  ISCRIZIONE: 'iscrizione', // subscribe() or getSubscription() failed
  CONFERMA: 'conferma', // the PUT failed, or did not confirm
  REVOCA: 'revoca', // unsubscribe() or the DELETE failed
  STATO: 'stato', // GET /api/push/stato failed: no tolerance, no publication
  COMPOSIZIONE: 'composizione', // the calendar could not be composed
  PUBBLICAZIONE: 'pubblicazione', // PUT /api/push/calendario failed
});

export const ESITI_PUBBLICAZIONE = Object.freeze({
  PUBBLICATA: 'pubblicata', // the server holds this plan
  INVARIATA: 'invariata', // equal to the last publication that went through
  NON_PUBBLICATA: 'non_pubblicata', // the server keeps the previous one: motivo says why
});

const E = ESITI_CANALE;
const M = MOTIVI_CANALE;

function record(esito, motivo = null, dettaglio = null) {
  return { esito, motivo, dettaglio };
}

function dettaglioDi(errore) {
  if (errore === null || errore === undefined) return null;
  const nome = typeof errore.name === 'string' ? errore.name : '';
  const messaggio = typeof errore.message === 'string' ? errore.message : String(errore);
  const testo = nome && messaggio ? `${nome}: ${messaggio}` : nome || messaggio;
  return testo ? testo.slice(0, 200) : null;
}

/**
 * The VAPID public key as subscribe() takes it: the 65 bytes of an
 * uncompressed P-256 point, or null.
 * @param {unknown} testo base64url, as /api/push/chiave returns it
 * @returns {Uint8Array|null}
 */
export function chiaveDaBase64Url(testo) {
  if (typeof testo !== 'string' || !/^[A-Za-z0-9_-]+=*$/.test(testo)) return null;
  try {
    const base64 = testo.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
    const grezzo = globalThis.atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const byte = new Uint8Array(grezzo.length);
    for (let i = 0; i < grezzo.length; i += 1) byte[i] = grezzo.charCodeAt(i);
    return byte.length === 65 && byte[0] === 0x04 ? byte : null;
  } catch {
    return null;
  }
}

function byteDi(valore) {
  if (valore === null || valore === undefined) return null;
  try {
    if (ArrayBuffer.isView(valore)) {
      return new Uint8Array(valore.buffer, valore.byteOffset, valore.byteLength);
    }
    if (typeof valore.byteLength === 'number') return new Uint8Array(valore);
  } catch {
    return null;
  }
  return null;
}

/**
 * Whether a subscription is bound to this key: true, false, or null when the
 * subscription does not say its key (PushSubscription.options absent).
 * @param {PushSubscription} iscrizione
 * @param {Uint8Array} chiave
 * @returns {boolean|null}
 */
export function stessaChiave(iscrizione, chiave) {
  const legata = byteDi(iscrizione?.options?.applicationServerKey);
  if (legata === null) return null;
  if (legata.length !== chiave.length) return false;
  for (let i = 0; i < chiave.length; i += 1) {
    if (legata[i] !== chiave[i]) return false;
  }
  return true;
}

/**
 * Ask the active worker whether it handles push: the question of
 * public/sw-push.js, on a port of its own. true only for the answer of this
 * protocol version; false on silence, on any other answer, or on any error.
 * @param {ServiceWorkerRegistration} registrazione
 * @param {number} attesaMs
 * @returns {Promise<boolean>}
 */
export function chiediAlWorker(registrazione, attesaMs = ATTESA_WORKER_MS) {
  return new Promise((risolvi) => {
    const worker = registrazione?.active;
    if (!worker || typeof worker.postMessage !== 'function') {
      risolvi(false);
      return;
    }
    let porte;
    try {
      porte = new globalThis.MessageChannel();
    } catch {
      risolvi(false);
      return;
    }
    let finito = false;
    let timer = null;
    function fine(valore) {
      if (finito) return;
      finito = true;
      clearTimeout(timer);
      try {
        porte.port1.close();
      } catch {
        // already closed
      }
      risolvi(valore);
    }
    timer = setTimeout(() => fine(false), attesaMs);
    porte.port1.onmessage = (evento) => {
      const dati = evento.data;
      fine(
        dati !== null && typeof dati === 'object'
          && dati.tipo === DOMANDA_PRONTO && dati.versione === VERSIONE_PROTOCOLLO
      );
    };
    try {
      worker.postMessage({ tipo: DOMANDA_PRONTO }, [porte.port2]);
    } catch {
      fine(false);
    }
  });
}

function conAttesa(promessa, ms) {
  return new Promise((risolvi) => {
    const timer = setTimeout(() => risolvi(null), ms);
    Promise.resolve(promessa).then(
      (valore) => {
        clearTimeout(timer);
        risolvi(valore);
      },
      () => {
        clearTimeout(timer);
        risolvi(null);
      }
    );
  });
}

// The clocks of the phone, for the age of the heartbeat (step 4): the
// monotonic one and the wall one. Tests pass their own.
export const orologiBrowser = Object.freeze({
  mono: () => (typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Number.NaN),
  ms: () => Date.now(),
});

/** The browser, as the service sees it. Tests pass their own. */
export const piattaformaBrowser = Object.freeze({
  supportata() {
    return typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker)
      && typeof globalThis.PushManager !== 'undefined';
  },
  async registrazione() {
    const r = await conAttesa(navigator.serviceWorker.ready, ATTESA_REGISTRAZIONE_MS);
    return r && r.active && r.pushManager ? r : null;
  },
  permesso() {
    return typeof globalThis.Notification === 'undefined' ? 'denied' : globalThis.Notification.permission;
  },
});

/**
 * Build a channel service. The default instance below is the app's; tests
 * build their own with fakes.
 */
export function createCanaleService({
  modalitaApi = () => shouldUseApiRepo(),
  rete = reteCanale,
  piattaforma = piattaformaBrowser,
  attesaWorkerMs = ATTESA_WORKER_MS,
  orologi = orologiBrowser,
} = {}) {
  // API mode, read at every call. A reading that fails is local mode: the
  // channel stays inert, and the page timers do what they do today.
  function inModalitaApi() {
    try {
      return modalitaApi() === true;
    } catch {
      return false;
    }
  }

  // The last completed preparation: what the toggle's tap uses, synchronously.
  let preparazione = null;
  let preparando = null;
  // One operation at a time, in the order asked.
  let coda = Promise.resolve();
  // A renewal asked and not yet started, with the value it was asked for.
  let rinnovoInAttesa = null;

  function inCoda(operazione) {
    const turno = coda.then(operazione).catch(() => null);
    coda = turno;
    return turno;
  }

  async function leggiPreparazione() {
    if (!piattaforma.supportata()) return { motivo: M.NON_SUPPORTATO };
    const registrazione = await piattaforma.registrazione();
    if (!registrazione) return { motivo: M.WORKER_ASSENTE };
    let testo;
    try {
      testo = await rete.leggiChiave();
    } catch (errore) {
      return { registrazione, motivo: M.CHIAVE, dettaglio: dettaglioDi(errore) };
    }
    const chiave = chiaveDaBase64Url(testo);
    if (chiave === null) return { registrazione, motivo: M.CHIAVE_NON_VALIDA };
    if (!(await chiediAlWorker(registrazione, attesaWorkerMs))) {
      return { registrazione, chiave, motivo: M.WORKER_NON_PRONTO };
    }
    return { registrazione, chiave, motivo: null, dettaglio: null };
  }

  /**
   * Read registration, key and the worker's answer, before any tap needs
   * them: at the entry of the Notifiche section, and inside every renewal.
   * Never rejects; null outside API mode.
   */
  function prepara() {
    if (!inModalitaApi()) return Promise.resolve(null);
    if (preparando !== null) return preparando;
    preparando = (async () => {
      try {
        preparazione = await leggiPreparazione();
      } catch (errore) {
        preparazione = { motivo: M.WORKER_ASSENTE, dettaglio: dettaglioDi(errore) };
      }
      preparando = null;
      return preparazione;
    })();
    return preparando;
  }

  /**
   * The toggle's tap, in API mode. With the preparation complete, subscribe()
   * is called HERE, synchronously: the first act of the gesture, as S1
   * measured. null when the channel cannot subscribe in this tap: the caller
   * does what the toggle did before the channel.
   * @returns {Promise<{ok: boolean, iscrizione?: PushSubscription, errore?: unknown}>|null}
   */
  function iscriviNelGesto() {
    if (!inModalitaApi()) return null;
    const p = preparazione;
    if (p === null || p.motivo !== null) return null;
    let promessa;
    try {
      promessa = p.registrazione.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: p.chiave,
      });
    } catch (errore) {
      return Promise.resolve({ ok: false, errore });
    }
    return Promise.resolve(promessa).then(
      (iscrizione) => ({ ok: true, iscrizione }),
      (errore) => ({ ok: false, errore })
    );
  }

  async function conferma(iscrizione) {
    const id = rete.deviceId();
    if (id === null) return record(E.NON_ATTIVA, M.DEVICE_ID);
    let dati;
    try {
      dati = iscrizione.toJSON();
    } catch (errore) {
      return record(E.NON_ATTIVA, M.ISCRIZIONE, dettaglioDi(errore));
    }
    try {
      const risposta = await rete.confermaIscrizione({
        endpoint: dati?.endpoint,
        keys: { p256dh: dati?.keys?.p256dh, auth: dati?.keys?.auth },
        device_id: id,
      });
      return risposta?.attiva === true ? record(E.ATTIVA) : record(E.NON_ATTIVA, M.CONFERMA);
    } catch (errore) {
      return record(E.NON_ATTIVA, M.CONFERMA, dettaglioDi(errore));
    }
  }

  // Undo the phone's subscription and tell the server. The first error, or null.
  async function annulla(iscrizione) {
    let errore = null;
    if (iscrizione) {
      try {
        await iscrizione.unsubscribe();
      } catch (e) {
        errore = e;
      }
    }
    const id = rete.leggiDeviceId();
    if (id !== null) {
      try {
        await rete.revocaIscrizione(id);
      } catch (e) {
        errore = errore ?? e;
      }
    }
    return errore;
  }

  /**
   * After the toggle's tap: the PUT that confirms the subscription the tap
   * made, or the reason the channel did not turn on.
   * @param {{ok: boolean, iscrizione?: PushSubscription, errore?: unknown}|null} esitoGesto
   */
  function accendi(esitoGesto) {
    if (!inModalitaApi()) return Promise.resolve(null);
    return inCoda(async () => {
      if (esitoGesto === null || esitoGesto === undefined) {
        const p = preparazione;
        return record(E.NON_ATTIVA, p?.motivo ?? M.PREPARAZIONE, p?.dettaglio ?? null);
      }
      if (!esitoGesto.ok) return record(E.NON_ATTIVA, M.ISCRIZIONE, dettaglioDi(esitoGesto.errore));
      return conferma(esitoGesto.iscrizione);
    });
  }

  async function eseguiRinnovo(voluto) {
    if (!piattaforma.supportata()) return voluto ? record(E.NON_ATTIVA, M.NON_SUPPORTATO) : record(E.SPENTA);
    const registrazione = await piattaforma.registrazione();
    if (!registrazione) return voluto ? record(E.NON_ATTIVA, M.WORKER_ASSENTE) : record(E.SPENTA);
    let iscrizione;
    try {
      iscrizione = await registrazione.pushManager.getSubscription();
    } catch (errore) {
      return voluto
        ? record(E.NON_ATTIVA, M.ISCRIZIONE, dettaglioDi(errore))
        : record(E.SPENTA, M.REVOCA, dettaglioDi(errore));
    }
    if (!voluto || piattaforma.permesso() !== 'granted') {
      const errore = iscrizione ? await annulla(iscrizione) : null;
      if (voluto) return record(E.NON_ATTIVA, M.PERMESSO);
      return errore ? record(E.SPENTA, M.REVOCA, dettaglioDi(errore)) : record(E.SPENTA);
    }
    const p = await prepara();
    if (p === null || p.motivo !== null) {
      return record(E.NON_ATTIVA, p?.motivo ?? M.WORKER_ASSENTE, p?.dettaglio ?? null);
    }
    if (iscrizione && stessaChiave(iscrizione, p.chiave) === false) {
      try {
        await iscrizione.unsubscribe();
      } catch (errore) {
        return record(E.NON_ATTIVA, M.ISCRIZIONE, dettaglioDi(errore));
      }
      iscrizione = null;
    }
    if (!iscrizione) {
      try {
        iscrizione = await registrazione.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: p.chiave,
        });
      } catch (errore) {
        return record(E.NON_ATTIVA, M.ISCRIZIONE, dettaglioDi(errore));
      }
    }
    return conferma(iscrizione);
  }

  /**
   * At every opening and return to the foreground. null outside API mode.
   * @param {{voluto: boolean}} opzioni voluto: the toggle is on
   */
  function rinnova({ voluto } = {}) {
    if (!inModalitaApi()) return Promise.resolve(null);
    const valore = voluto === true;
    if (rinnovoInAttesa !== null && rinnovoInAttesa.valore === valore) return rinnovoInAttesa.turno;
    const attesa = { valore, turno: null };
    attesa.turno = inCoda(() => {
      if (rinnovoInAttesa === attesa) rinnovoInAttesa = null;
      return eseguiRinnovo(valore);
    });
    rinnovoInAttesa = attesa;
    return attesa.turno;
  }

  /** The toggle off, or the permission revoked: unsubscribe, then DELETE. */
  function spegni() {
    if (!inModalitaApi()) return Promise.resolve(null);
    return inCoda(async () => {
      let iscrizione = null;
      let errore = null;
      if (piattaforma.supportata()) {
        const registrazione = await piattaforma.registrazione();
        if (registrazione) {
          try {
            iscrizione = await registrazione.pushManager.getSubscription();
          } catch (e) {
            errore = e;
          }
        }
      }
      errore = (await annulla(iscrizione)) ?? errore;
      return errore ? record(E.SPENTA, M.REVOCA, dettaglioDi(errore)) : record(E.SPENTA);
    });
  }

  // What the last publication that went through carried, as a signature:
  // the entries and the horizon, plus the sleep the end notice depends on.
  // Read and written only by eseguiPubblicazione, which runs inside the
  // queue: one publication at a time, so no other one can interleave.
  let ultimaFirma = null;
  const giaPubblicata = (firma) => firma === ultimaFirma;
  const ricordaPubblicata = (firma) => {
    ultimaFirma = firma;
  };
  // A publication asked and not yet started: its state is the latest asked.
  let pubblicazioneInAttesa = null;

  function firmaDi(stato) {
    return JSON.stringify({
      voci: vociDelCalendario(stato.plan),
      orizzonte: fineOrizzonte(stato.lastBuiltForDay),
      sonno: stato.profiloAttivo?.ora_sonno ?? null,
      sveglia: stato.profiloAttivo?.ora_sveglia ?? null,
    });
  }

  function esitoPubblicazione(esito, motivo = null, dettaglio = null, voci = null) {
    return { esito, motivo, dettaglio, voci };
  }

  async function eseguiPubblicazione(stato) {
    const P = ESITI_PUBBLICAZIONE;
    let firma;
    try {
      firma = firmaDi(stato);
    } catch (errore) {
      return esitoPubblicazione(P.NON_PUBBLICATA, M.COMPOSIZIONE, dettaglioDi(errore));
    }
    if (giaPubblicata(firma)) return esitoPubblicazione(P.INVARIATA);
    const id = rete.deviceId();
    if (id === null) return esitoPubblicazione(P.NON_PUBBLICATA, M.DEVICE_ID);
    let statoServer;
    try {
      statoServer = await rete.leggiStato();
    } catch (errore) {
      return esitoPubblicazione(P.NON_PUBBLICATA, M.STATO, dettaglioDi(errore));
    }
    let calendario;
    try {
      calendario = componiCalendario({
        plan: stato.plan,
        profilo: stato.profiloAttivo,
        oggi: stato.lastBuiltForDay,
        tolleranzaMin: statoServer?.tolleranza_min,
      });
    } catch (errore) {
      return esitoPubblicazione(P.NON_PUBBLICATA, M.COMPOSIZIONE, dettaglioDi(errore));
    }
    try {
      await rete.pubblicaCalendario({ device_id: id, ...calendario });
    } catch (errore) {
      return esitoPubblicazione(P.NON_PUBBLICATA, M.PUBBLICAZIONE, dettaglioDi(errore));
    }
    ricordaPubblicata(firma);
    return esitoPubblicazione(P.PUBBLICATA, null, null, calendario.voci.length);
  }

  /**
   * Publish the plan of this state. null outside API mode.
   * @param {{plan: Array, profiloAttivo: object, lastBuiltForDay: string}} stato
   */
  function pubblica(stato) {
    if (!inModalitaApi()) return Promise.resolve(null);
    if (pubblicazioneInAttesa !== null) {
      pubblicazioneInAttesa.stato = stato;
      return pubblicazioneInAttesa.turno;
    }
    const attesa = { stato, turno: null };
    attesa.turno = inCoda(() => {
      if (pubblicazioneInAttesa === attesa) pubblicazioneInAttesa = null;
      return eseguiPubblicazione(attesa.stato);
    });
    pubblicazioneInAttesa = attesa;
    return attesa.turno;
  }

  // A reading of the state asked and not yet started.
  let letturaInAttesa = null;

  /**
   * GET /api/push/stato (step 4), in the queue after what was asked before
   * it: a reading after a renewal sees its subscription. The two clocks are
   * read BEFORE the request leaves, so the age computed from them is never
   * younger than the true one. A failure is a record too, never a throw.
   * null outside API mode.
   */
  function leggiStato() {
    if (!inModalitaApi()) return Promise.resolve(null);
    if (letturaInAttesa !== null) return letturaInAttesa.turno;
    const attesa = { turno: null };
    attesa.turno = inCoda(async () => {
      if (letturaInAttesa === attesa) letturaInAttesa = null;
      const lettoMono = orologi.mono();
      const lettoMs = orologi.ms();
      try {
        const risposta = await rete.leggiStato();
        return { risposta, lettoMono, lettoMs, deviceId: rete.leggiDeviceId(), errore: null };
      } catch (errore) {
        return { risposta: null, lettoMono, lettoMs, deviceId: rete.leggiDeviceId(), errore: dettaglioDi(errore) };
      }
    });
    letturaInAttesa = attesa;
    return attesa.turno;
  }

  return {
    prepara,
    iscriviNelGesto,
    accendi,
    rinnova,
    spegni,
    pubblica,
    leggiStato,
  };
}

/** The app's instance, injected through the services bag of AppContext. */
export const canalePush = createCanaleService();
