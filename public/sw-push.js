// PharmaTimer -- the push handler of the service worker: the Web Push
// channel, branch A. Decisions 2, 14 and 31 of STATO_CORRENTE.md.
//
// The generated sw.js loads this file with importScripts, the one line of
// vite.config.js that decision 14 A unlocked. It is a classic script served
// next to sw.js, so the relative path resolves under both bases, "/" and
// "/pharmatimer/". Everything sits inside one function scope: nothing leaks
// into the globals of the generated worker.
//
// The rules, each pinned by src/pwa/sw-push.test.js, which runs this file:
// - Every push shows exactly one notification (decision 2 W). iOS
//   extinguishes a subscription after three pushes without one (S11), so a
//   payload this file cannot read still shows the neutral text.
// - A dose push shows the title and body the phone published. Before that,
//   the phone's own ledger (the taccuino) is read: if the dose is already
//   closed there, the body says so (decision 31 A). The read is bounded in
//   time, and any failure keeps the published text. Never suppressed.
// - Read only: no action buttons, nothing written to the ledger or to the
//   outbox (I2). The database is opened without a version, never created,
//   never upgraded, and closed as soon as the read ends, so it never blocks
//   a schema upgrade of the app.
// - A tap brings an open window forward, or opens Oggi under the worker's
//   scope, never at an absolute "/oggi".
// - Before subscribing, the page asks whether the active worker handles
//   push: this file answers on the port it is given.
(function () {
  "use strict";

  // The ledger as src/data/db.js declares it. The test reads it through the
  // real db.js schema, so a rename there turns the test red.
  const NOME_DB = "pharmatimer";
  const TABELLA = "log_assunzioni";
  const INDICE = "[farmaco_id+data]";

  // How long the ledger read may take before the published text is shown
  // as it is. Conventional: iOS grants the worker a few seconds per push.
  const ATTESA_TACCUINO_MS = 1500;

  // The text of a push this file cannot read. The same text as the server's
  // neutral notice (decision 27, backend/pharmatimer_api/canale.py): the test
  // holds the two together.
  const TITOLO_NEUTRO = "PharmaTimer";
  const CORPO_NEUTRO = "Apri l'app per controllare i promemoria.";

  // A dose already closed in the ledger, as the rewritten body says it.
  const CHIUSE = {
    presa: "già registrata come presa",
    saltata: "già segnata come saltata",
    sospesa: "già segnata come sospesa",
  };

  // The question the page asks before subscribing, and the protocol version
  // of this answer.
  const DOMANDA_PRONTO = "pt-push-pronto";
  const VERSIONE_PROTOCOLLO = 1;

  function dueCifre(n) {
    return String(n).padStart(2, "0");
  }

  // The published payload, or null when it cannot be read. A dose push
  // carries its slot key, the same key as the log (decision 8).
  function leggiPayload(dati) {
    if (!dati || typeof dati.text !== "function") return null;
    const grezzo = JSON.parse(dati.text());
    if (grezzo === null || typeof grezzo !== "object") return null;
    if (typeof grezzo.titolo !== "string" || grezzo.titolo === "") return null;
    if (typeof grezzo.corpo !== "string") return null;
    return {
      titolo: grezzo.titolo,
      corpo: grezzo.corpo,
      dose: grezzo.tipo === "dose" ? chiaveDose(grezzo) : null,
    };
  }

  function chiaveDose(p) {
    if (!Number.isInteger(p.farmaco_id) || p.farmaco_id <= 0) return null;
    if (typeof p.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.data)) return null;
    if (!Number.isInteger(p.dose_numero) || p.dose_numero <= 0) return null;
    return {
      farmaco_id: p.farmaco_id,
      data: p.data,
      dose_numero: p.dose_numero,
      istante_ms: Number.isFinite(p.istante_ms) ? p.istante_ms : null,
    };
  }

  // The tag of the page timers for the same dose (src/services/notifications.js):
  // the test holds the two together.
  function tagDose(dose) {
    return "dose-" + dose.farmaco_id + "-" + dose.dose_numero + "-" + dose.data;
  }

  // The ledger row of the dose, or null: no database, no table, no row, more
  // than one row for the same dose, an error, or the time limit. Never rejects.
  function rigaNelTaccuino(dose) {
    return new Promise(function (risolvi) {
      let finito = false;
      let timer = null;
      function fine(valore) {
        if (finito) return;
        finito = true;
        if (timer !== null) clearTimeout(timer);
        risolvi(valore);
      }
      timer = setTimeout(function () { fine(null); }, ATTESA_TACCUINO_MS);
      let richiesta;
      try {
        // No version: an existing database opens as it is, a missing one asks
        // for an upgrade, and the upgrade is refused below.
        richiesta = self.indexedDB.open(NOME_DB);
      } catch {
        fine(null);
        return;
      }
      richiesta.onupgradeneeded = function () {
        // The database does not exist: creating it belongs to the app's Dexie.
        richiesta.transaction.abort();
      };
      richiesta.onerror = function () { fine(null); };
      richiesta.onblocked = function () { fine(null); };
      richiesta.onsuccess = function () {
        const connessione = richiesta.result;
        function chiudiConnessione() {
          connessione.close();
        }
        connessione.onversionchange = chiudiConnessione;
        if (finito) {
          chiudiConnessione();
          return;
        }
        try {
          if (!connessione.objectStoreNames.contains(TABELLA)) {
            chiudiConnessione();
            fine(null);
            return;
          }
          const archivio = connessione.transaction(TABELLA, "readonly").objectStore(TABELLA);
          const lettura = archivio.index(INDICE).getAll([dose.farmaco_id, dose.data]);
          lettura.onsuccess = function () {
            chiudiConnessione();
            const righe = (lettura.result || []).filter(function (r) {
              return r !== null && typeof r === "object" && r.dose_numero === dose.dose_numero;
            });
            // Two rows for one dose make the record ambiguous: nothing is asserted.
            fine(righe.length === 1 ? righe[0] : null);
          };
          lettura.onerror = function () {
            chiudiConnessione();
            fine(null);
          };
        } catch {
          chiudiConnessione();
          fine(null);
        }
      };
    });
  }

  function statoChiuso(riga) {
    if (riga === null || typeof riga !== "object") return null;
    return Object.prototype.hasOwnProperty.call(CHIUSE, riga.stato) ? riga.stato : null;
  }

  // "HH:MM" from "HH:MM" or from an ISO date-time, as the ledger may hold it.
  function oraDiTesto(valore) {
    if (typeof valore !== "string") return null;
    const trovato = /(?:^|T)(\d{2}):(\d{2})/.exec(valore);
    return trovato === null ? null : trovato[1] + ":" + trovato[2];
  }

  function corpoRiscritto(dose, stato, riga) {
    let frase = CHIUSE[stato];
    if (stato === "presa") {
      const ora = oraDiTesto(riga.ora_effettiva);
      if (ora !== null) frase += " alle " + ora;
    }
    frase += ".";
    const quando = dose.istante_ms === null ? null : new Date(dose.istante_ms);
    if (quando === null || Number.isNaN(quando.getTime())) {
      return frase.charAt(0).toUpperCase() + frase.slice(1);
    }
    return "Dose delle " + dueCifre(quando.getHours()) + ":" + dueCifre(quando.getMinutes()) + ": " + frase;
  }

  // The notification of a readable push, or null.
  async function componi(dati) {
    const messaggio = leggiPayload(dati);
    if (messaggio === null) return null;
    const notifica = { titolo: messaggio.titolo, opzioni: { body: messaggio.corpo } };
    if (messaggio.dose !== null) {
      notifica.opzioni.tag = tagDose(messaggio.dose);
      let riga = null;
      try {
        riga = await rigaNelTaccuino(messaggio.dose);
      } catch {
        riga = null;
      }
      const stato = statoChiuso(riga);
      if (stato !== null) {
        try {
          notifica.opzioni.body = corpoRiscritto(messaggio.dose, stato, riga);
        } catch {
          notifica.opzioni.body = messaggio.corpo;
        }
      }
    }
    return notifica;
  }

  function notificaNeutra() {
    return { titolo: TITOLO_NEUTRO, opzioni: { body: CORPO_NEUTRO } };
  }

  async function mostra(dati) {
    let notifica = null;
    try {
      notifica = await componi(dati);
    } catch {
      notifica = null;
    }
    if (notifica === null) {
      notifica = notificaNeutra();
    }
    return self.registration.showNotification(notifica.titolo, notifica.opzioni);
  }

  function urlOggi() {
    return new URL("oggi", self.registration.scope).href;
  }

  // An open window is brought forward as it is, never navigated: it may hold
  // a form not yet saved. Without one, Oggi opens under the worker's scope.
  async function portaInPrimoPiano() {
    const finestre = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const finestra of finestre) {
      try {
        await finestra.focus();
        return;
      } catch {
        // This window refused the focus: try the next one, then a new window.
      }
    }
    await self.clients.openWindow(urlOggi());
  }

  self.addEventListener("push", function (event) {
    event.waitUntil(mostra(event.data));
  });

  self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    event.waitUntil(portaInPrimoPiano());
  });

  self.addEventListener("message", function (event) {
    const dati = event.data;
    if (dati === null || typeof dati !== "object" || dati.tipo !== DOMANDA_PRONTO) return;
    const porta = event.ports && event.ports[0];
    if (porta) porta.postMessage({ tipo: DOMANDA_PRONTO, versione: VERSIONE_PROTOCOLLO });
  });
})();
