// @vitest-environment node
// ============================================================
// public/sw-push.js -- the push handler of the service worker, run as is.
// ============================================================
// Decisions 2, 14 and 31 of STATO_CORRENTE.md. The file runs in a node:vm
// context that plays the worker scope: `self`, its registration and clients,
// the timers, and IndexedDB from fake-indexeddb under the REAL schema of
// src/data/db.js. The ledger rows are written by the real
// LocalRepository.upsertLogsBatch, the write that the taccuino-prima path of
// SyncRepository performs: the worker is tested on what a touch writes.
//
// It sits here and not next to the file: public/ is copied into dist/ and
// vitest reads src/ only (CLAUDE.md section 13, declared exception). Every
// pin below has its row in scripts/audit/mutazioni.py.
//
// Order matters: `fake-indexeddb/auto` first, so db.js finds indexedDB.

import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../data/db.js";
import { LocalRepository } from "../data/repository/LocalRepository.js";
import { createNotificationsService } from "../services/notifications.js";

const leggi = (relativo) => readFileSync(new URL(relativo, import.meta.url), "utf8");
const SORGENTE = leggi("../../public/sw-push.js");
const SCOPE = "https://pt.esempio/pharmatimer/";

// 08:00 of 2026-10-02 in Rome (CEST): the suite pins TZ=Europe/Rome.
const ISTANTE = Date.parse("2026-10-02T08:00:00+02:00");
const CORPO = "Dose delle 08:00, prima di colazione. Apri l'app per controllare.";

function pushDose(campi = {}) {
  return {
    v: 1,
    tipo: "dose",
    titolo: "Eutirox 50",
    corpo: CORPO,
    istante_ms: ISTANTE,
    farmaco_id: 7,
    data: "2026-10-02",
    dose_numero: 1,
    ...campi,
  };
}

function datiPush(payload) {
  if (payload === null) return null;
  const testo = typeof payload === "string" ? payload : JSON.stringify(payload);
  return { text: () => testo };
}

// The worker scope, built fresh for every worker started.
function avviaWorker({ indexedDB = globalThis.indexedDB, timer = setTimeout, finestre = [] } = {}) {
  const ascoltatori = {};
  const notifiche = [];
  const aperte = [];
  const contesto = {
    indexedDB,
    setTimeout: timer,
    clearTimeout,
    URL,
    addEventListener(tipo, fn) {
      (ascoltatori[tipo] = ascoltatori[tipo] || []).push(fn);
    },
    registration: {
      scope: SCOPE,
      async showNotification(titolo, opzioni) {
        notifiche.push({ titolo, opzioni });
      },
    },
    clients: {
      async matchAll() {
        return finestre;
      },
      async openWindow(url) {
        aperte.push(url);
        return null;
      },
    },
  };
  contesto.self = contesto;
  vm.runInNewContext(SORGENTE, contesto, { filename: "public/sw-push.js" });
  async function emetti(tipo, evento) {
    const attese = [];
    evento.waitUntil = (p) => attese.push(p);
    for (const fn of ascoltatori[tipo] || []) fn(evento);
    await Promise.all(attese);
  }
  return {
    notifiche,
    aperte,
    push: (payload) => emetti("push", { data: datiPush(payload) }),
    tocco: (notification) => emetti("notificationclick", { notification }),
    messaggio: (data, ports) => emetti("message", { data, ports }),
  };
}

const repo = new LocalRepository();

function registra(campi) {
  return repo.upsertLogsBatch([
    {
      farmaco_id: 7,
      data: "2026-10-02",
      dose_numero: 1,
      ora_prevista: "08:00",
      ora_effettiva: null,
      delta_minuti: null,
      ora_ricalcolata: null,
      gap_minuti: 0,
      recupero_minuti: 0,
      stato: "prevista",
      note: null,
      ...campi,
    },
  ]);
}

function esitoRichiesta(richiesta) {
  return new Promise((risolvi, rifiuta) => {
    richiesta.onsuccess = () => risolvi(richiesta.result);
    richiesta.onerror = () => rifiuta(richiesta.error);
    richiesta.onblocked = () => rifiuta(new Error("richiesta bloccata"));
  });
}

beforeEach(async () => {
  if (!db.isOpen()) {
    await db.open();
  }
  await db.log_assunzioni.clear();
});

describe("un push mostra sempre una notifica, nei due versi (decisione 2)", () => {
  it("un push di dose leggibile mostra titolo e corpo pubblicati, col tag della dose", async () => {
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].titolo).toBe("Eutirox 50");
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
    expect(w.notifiche[0].opzioni.tag).toBe("dose-7-1-2026-10-02");
  });

  it.each([
    ["senza dati", null],
    ["non JSON", "non e JSON"],
    ["oggetto vuoto", {}],
    ["senza titolo", { tipo: "dose", corpo: "x" }],
    ["titolo vuoto", { tipo: "dose", titolo: "", corpo: "x" }],
    ["senza corpo", { tipo: "dose", titolo: "Eutirox 50" }],
    ["una lista", "[1, 2]"],
  ])("un push illeggibile (%s) mostra il testo neutro, mai zero", async (_nome, payload) => {
    const w = avviaWorker();
    await w.push(payload);
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].titolo).toBe("PharmaTimer");
    expect(w.notifiche[0].opzioni.body).toBe("Apri l'app per controllare i promemoria.");
  });

  it("gli avvisi neutro e di fine si mostrano col loro testo, senza tag e senza leggere il taccuino", async () => {
    const apertura = vi.fn(() => {
      throw new Error("un avviso senza dose non legge il taccuino");
    });
    const w = avviaWorker({ indexedDB: { open: apertura } });
    await w.push({ v: 1, tipo: "avviso_neutro", titolo: "PharmaTimer", corpo: "Apri l'app per controllare i promemoria." });
    await w.push({ v: 1, tipo: "avviso_fine", titolo: "PharmaTimer", corpo: "Apri l'app per aggiornare i promemoria." });
    expect(apertura).not.toHaveBeenCalled();
    expect(w.notifiche.map((n) => n.opzioni.body)).toEqual([
      "Apri l'app per controllare i promemoria.",
      "Apri l'app per aggiornare i promemoria.",
    ]);
    expect(w.notifiche.every((n) => n.opzioni.tag === undefined)).toBe(true);
  });
});

describe("il taccuino all'arrivo (decisione 31)", () => {
  it.each([
    ["presa", "2026-10-02T07:55:00", "Dose delle 08:00: già registrata come presa alle 07:55."],
    ["saltata", null, "Dose delle 08:00: già segnata come saltata."],
    ["sospesa", null, "Dose delle 08:00: già segnata come sospesa."],
  ])("dose %s nel taccuino: il corpo lo dice, e la notifica parte", async (stato, oraEffettiva, atteso) => {
    await registra({ stato, ora_effettiva: oraEffettiva });
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].titolo).toBe("Eutirox 50");
    expect(w.notifiche[0].opzioni.body).toBe(atteso);
    expect(w.notifiche[0].opzioni.tag).toBe("dose-7-1-2026-10-02");
  });

  it.each(["prevista", "ricalcolata"])("dose %s nel taccuino: resta il testo pubblicato", async (stato) => {
    await registra({ stato, ora_ricalcolata: stato === "ricalcolata" ? "2026-10-02T08:30" : null });
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
  });

  it("la riga di un'altra dose non conta: resta il testo pubblicato", async () => {
    await registra({ dose_numero: 2, stato: "presa", ora_effettiva: "2026-10-02T13:05:00" });
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
  });

  it("due righe per la stessa dose: nulla si afferma, resta il testo pubblicato", async () => {
    await db.log_assunzioni.bulkAdd([
      { farmaco_id: 7, data: "2026-10-02", dose_numero: 1, stato: "presa", ora_effettiva: "2026-10-02T07:55:00" },
      { farmaco_id: 7, data: "2026-10-02", dose_numero: 1, stato: "prevista", ora_effettiva: null },
    ]);
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
  });

  it("senza istante nel payload il corpo riscritto comincia dalla frase", async () => {
    await registra({ stato: "presa", ora_effettiva: "07:55" });
    const w = avviaWorker();
    await w.push(pushDose({ istante_ms: undefined }));
    expect(w.notifiche[0].opzioni.body).toBe("Già registrata come presa alle 07:55.");
  });

  it("il worker non scrive nel taccuino", async () => {
    await registra({ stato: "presa", ora_effettiva: "2026-10-02T07:55:00" });
    await registra({ dose_numero: 2, stato: "prevista" });
    const prima = await db.log_assunzioni.orderBy("id").toArray();
    const w = avviaWorker();
    await w.push(pushDose());
    await w.push(pushDose({ dose_numero: 2 }));
    const dopo = await db.log_assunzioni.orderBy("id").toArray();
    expect(dopo).toEqual(prima);
  });

  it("database assente: resta il testo pubblicato, e il worker non lo crea", async () => {
    db.close();
    await esitoRichiesta(indexedDB.deleteDatabase("pharmatimer"));
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
    const nomi = (await indexedDB.databases()).map((d) => d.name);
    expect(nomi).not.toContain("pharmatimer");
  });

  it("una lettura che non risponde: allo scadere resta il testo pubblicato", { timeout: 2000 }, async () => {
    const w = avviaWorker({
      indexedDB: { open: () => ({}) },
      timer: (fn) => setTimeout(fn, 0),
    });
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
  });

  it("un errore all'apertura: resta il testo pubblicato", async () => {
    const w = avviaWorker({
      indexedDB: {
        open: () => {
          throw new Error("IndexedDB non disponibile");
        },
      },
    });
    await w.push(pushDose());
    expect(w.notifiche).toHaveLength(1);
    expect(w.notifiche[0].opzioni.body).toBe(CORPO);
  });
});

describe("il tocco (decisione 14)", () => {
  it("senza finestre aperte apre Oggi sotto lo scope del worker, non /oggi assoluto", async () => {
    const w = avviaWorker();
    const notifica = { close: vi.fn() };
    await w.tocco(notifica);
    expect(notifica.close).toHaveBeenCalledTimes(1);
    expect(w.aperte).toEqual(["https://pt.esempio/pharmatimer/oggi"]);
  });

  it("con una finestra aperta la porta in primo piano, senza navigarla ne aprirne un'altra", async () => {
    const finestra = { focus: vi.fn(async () => finestra), navigate: vi.fn() };
    const w = avviaWorker({ finestre: [finestra] });
    await w.tocco({ close: vi.fn() });
    expect(finestra.focus).toHaveBeenCalledTimes(1);
    expect(finestra.navigate).not.toHaveBeenCalled();
    expect(w.aperte).toEqual([]);
  });
});

describe("la domanda della pagina prima dell'iscrizione", () => {
  it("risponde sulla porta che riceve, con la versione del protocollo", async () => {
    const porta = { postMessage: vi.fn() };
    const w = avviaWorker();
    await w.messaggio({ tipo: "pt-push-pronto" }, [porta]);
    expect(porta.postMessage).toHaveBeenCalledWith({ tipo: "pt-push-pronto", versione: 1 });
  });

  it("non risponde ad altri messaggi", async () => {
    const porta = { postMessage: vi.fn() };
    const w = avviaWorker();
    await w.messaggio({ type: "SKIP_WAITING" }, [porta]);
    await w.messaggio({ tipo: "altro" }, [porta]);
    expect(porta.postMessage).not.toHaveBeenCalled();
  });
});

describe("le copie che il test tiene allineate", () => {
  it("il testo di un push illeggibile e quello dell'avviso neutro del server (decisione 27)", async () => {
    const canale = leggi("../../backend/pharmatimer_api/canale.py");
    const costante = (nome) => {
      const trovato = new RegExp("^" + nome + ' = "([^"]*)"$', "m").exec(canale);
      if (trovato === null) throw new Error("costante assente in canale.py: " + nome);
      return trovato[1];
    };
    const w = avviaWorker();
    await w.push(null);
    expect(w.notifiche[0].titolo).toBe(costante("TITOLO_AVVISI"));
    expect(w.notifiche[0].opzioni.body).toBe(costante("CORPO_AVVISO_NEUTRO"));
  });

  it("il tag di una dose e quello dei timer di pagina (services/notifications.js)", async () => {
    const catturati = [];
    class NotificaFinta {
      static permission = "granted";
      constructor(_titolo, opzioni) {
        catturati.push(opzioni.tag);
      }
    }
    vi.useFakeTimers({ now: ISTANTE - 60_000 });
    vi.stubGlobal("Notification", NotificaFinta);
    try {
      createNotificationsService().showDoseNotification(
        { dateStr: "2026-10-02", orario: { dose_numero: 1 }, ora_prevista: "08:00", ora_ricalcolata: null },
        { id: 7, nome: "Eutirox 50" }
      );
      vi.advanceTimersByTime(60_000);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
    const w = avviaWorker();
    await w.push(pushDose());
    expect(catturati).toHaveLength(1);
    expect(w.notifiche[0].opzioni.tag).toBe(catturati[0]);
  });

  it("vite.config.js carica il worker con una riga (decisione 14)", () => {
    const configurazione = leggi("../../vite.config.js");
    expect(configurazione).toMatch(/^\s*importScripts: \["sw-push\.js"\],/m);
    expect(SORGENTE.length).toBeGreaterThan(0);
  });
});

// Last on purpose: under the mutation that leaves the connection open, the
// upgrade below stays pending and would stall every test after it.
describe("per ultimo: lo schema dell'app", () => {
  it("il worker chiude il database: un aggiornamento dello schema non resta bloccato", async () => {
    await registra({ stato: "presa", ora_effettiva: "2026-10-02T07:55:00" });
    const versione = db.backendDB().version;
    const w = avviaWorker();
    await w.push(pushDose());
    expect(w.notifiche[0].opzioni.body).toBe("Dose delle 08:00: già registrata come presa alle 07:55.");
    const richiesta = indexedDB.open("pharmatimer", versione + 1);
    const esito = await new Promise((risolvi) => {
      richiesta.onblocked = () => risolvi("bloccato");
      richiesta.onsuccess = () => risolvi("aperto");
      richiesta.onerror = () => risolvi("errore");
    });
    expect(esito).toBe("aperto");
    richiesta.result.close();
    db.close();
    await esitoRichiesta(indexedDB.deleteDatabase("pharmatimer"));
  });
});
