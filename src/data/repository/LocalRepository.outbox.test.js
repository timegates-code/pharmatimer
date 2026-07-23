// @vitest-environment node
// ============================================================
// LocalRepository -- outbox primitives integration tests (CS-4 S2a).
// par.22.198-octovicies. SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_TEST
// ------------------------------------------------------------
// Exercises the 8 inert outbox primitives (db.js v5 store `outbox`)
// against REAL Dexie under fake-indexeddb -- same harness contract as
// LocalRepository.mirror.test.js (real db singleton, per-file
// isolation, beforeEach clear). No caller wires these yet (S2b/S3).
//
// `fake-indexeddb/auto` MUST be imported first so the global
// indexedDB exists before db.js performs any operation.
// ============================================================

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";
import { LocalRepository } from "./LocalRepository.js";

const repo = new LocalRepository();

function logRow(farmaco_id, data, dose_numero, stato = "presa") {
  return { farmaco_id, data, dose_numero, stato };
}

function makeElement(op, client_op_id, logs, extra = {}) {
  const primary = logs[0];
  return {
    stato: "pending",
    op,
    client_op_id,
    logs,
    farmaco_id: primary.farmaco_id,
    data: primary.data,
    dose_numero: primary.dose_numero,
    created_at: new Date().toISOString(),
    attempts: 0,
    parked_reason: null,
    parked_at: null,
    ...extra,
  };
}

beforeEach(async () => {
  if (!db.isOpen()) {
    await db.open();
  }
  await db.transaction(
    "rw",
    db.farmaci,
    db.orari_base,
    db.log_assunzioni,
    db.impostazioni_app,
    db.profilo_utente,
    db.outbox,
    async () => {
      await db.farmaci.clear();
      await db.orari_base.clear();
      await db.log_assunzioni.clear();
      await db.impostazioni_app.clear();
      await db.profilo_utente.clear();
      await db.outbox.clear();
    }
  );
});

describe("LocalRepository.outbox -- enqueue / FIFO", () => {
  it("enqueue restituisce gli id assegnati in ordine di inserimento", async () => {
    const ids = await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
      makeElement("saltata", "uuid-2", [logRow(1, "2026-07-21", 2)]),
    ]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeLessThan(ids[1]); // FIFO == insertion order
  });

  it("nextPending restituisce il primo pending per id ASC", async () => {
    await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
      makeElement("saltata", "uuid-2", [logRow(1, "2026-07-21", 2)]),
    ]);
    const first = await repo.outboxNextPending();
    expect(first.client_op_id).toBe("uuid-1");
  });

  it("nextPending restituisce null quando non ci sono pending", async () => {
    const none = await repo.outboxNextPending();
    expect(none).toBeNull();
  });
});

describe("LocalRepository.outbox -- park / retry / remove / counts / list", () => {
  it("park sposta pending->parked e counts lo riflette", async () => {
    const [id1] = await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
    ]);
    await repo.outboxPark(id1, "SESSIONE_SCADUTA");
    expect(await repo.outboxCounts()).toEqual({ pending: 0, parked: 1 });
    const parked = await repo.outboxList("parked");
    expect(parked[0].parked_reason).toBe("SESSIONE_SCADUTA");
    expect(parked[0].parked_at).not.toBeNull();
  });

  it("retry riporta parked->pending allo STESSO id (posizione FIFO preservata)", async () => {
    const ids = await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
      makeElement("saltata", "uuid-2", [logRow(1, "2026-07-21", 2)]),
    ]);
    await repo.outboxPark(ids[0], "X");
    // uuid-2 rimane l unico pending -> nextPending == uuid-2
    expect((await repo.outboxNextPending()).client_op_id).toBe("uuid-2");
    await repo.outboxRetry(ids[0]);
    // uuid-1 (id inferiore) rientra pending -> torna primo in FIFO
    const next = await repo.outboxNextPending();
    expect(next.client_op_id).toBe("uuid-1");
    expect(next.parked_reason).toBeNull();
  });

  it("remove elimina l elemento", async () => {
    const [id1] = await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
    ]);
    await repo.outboxRemove(id1);
    expect(await repo.outboxCounts()).toEqual({ pending: 0, parked: 0 });
  });

  it("list filtra per stato ordinando per id", async () => {
    await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
      makeElement("saltata", "uuid-2", [logRow(1, "2026-07-21", 2)]),
      makeElement("recupero", "uuid-3", [logRow(1, "2026-07-21", 3)]),
    ]);
    const pending = await repo.outboxList("pending");
    expect(pending.map((e) => e.client_op_id)).toEqual([
      "uuid-1",
      "uuid-2",
      "uuid-3",
    ]);
  });
});

describe("LocalRepository.outbox -- protectedKeys (M2)", () => {
  it("raccoglie le chiavi dose da logs[] di pending E parked", async () => {
    const ids = await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
      makeElement("recupero", "uuid-2", [
        logRow(2, "2026-07-21", 1),
        logRow(2, "2026-07-21", 2),
      ]),
    ]);
    await repo.outboxPark(ids[1], "X"); // uno pending, uno parked
    const keys = await repo.outboxProtectedKeys();
    expect(keys.has("1|2026-07-21|1")).toBe(true);
    expect(keys.has("2|2026-07-21|1")).toBe(true);
    expect(keys.has("2|2026-07-21|2")).toBe(true);
    expect(keys.size).toBe(3);
  });

  it("Set vuoto quando l outbox e vuota", async () => {
    const keys = await repo.outboxProtectedKeys();
    expect(keys.size).toBe(0);
  });
});

describe("LocalRepository.outbox -- wipe (6.205: resetAllData include outbox)", () => {
  it("la transazione di wipe (forma resetAllData, 6 store) svuota anche outbox", async () => {
    await repo.outboxEnqueue([
      makeElement("presa", "uuid-1", [logRow(1, "2026-07-21", 1)]),
    ]);
    expect((await repo.outboxCounts()).pending).toBe(1);
    // Store-set della resetAllData (actions.js): outbox DEVE esserci.
    await db.transaction(
      "rw",
      db.farmaci,
      db.orari_base,
      db.log_assunzioni,
      db.impostazioni_app,
      db.profilo_utente,
      db.outbox,
      async () => {
        await db.farmaci.clear();
        await db.orari_base.clear();
        await db.log_assunzioni.clear();
        await db.impostazioni_app.clear();
        await db.profilo_utente.clear();
        await db.outbox.clear();
      }
    );
    expect(await repo.outboxCounts()).toEqual({ pending: 0, parked: 0 });
  });
});

// ============================================================
// SONDA WP1 -- tocco indivisibile: la transazione a DUE store
// (par.22.198-triginties / S2b punto 3). SENTINEL_S2B_WP1_PROBE
// ------------------------------------------------------------
// Domanda misurata: la zone Dexie sopravvive allo `await fn()` di
// LocalRepository._wrap? Se non sopravvivesse, `outboxEnqueue`
// chiamata DENTRO una transazione ambientale scriverebbe fuori da
// quella transazione, e il tocco indivisibile progettato per S2c
// (registro + outbox, o tutto o nulla) non reggerebbe: una presa
// potrebbe restare nel registro senza il proprio elemento di coda,
// cioe non raggiungere mai il server senza che nulla lo segnali (M2).
//
// Le asserzioni sono sul ROLLBACK, che e lo invariante clinico.
// Il CODICE di errore che arriva al chiamante viene MISURATO e
// stampato, non pinnato: e la domanda WP1-bis aperta a novemvicies
// (la idempotenza di _wrap fa attraversare intatto lo errore gia
// avvolto da outboxEnqueue, quindi il chiamante potrebbe NON vedere
// TRANSACTION_ABORT). Il valore misurato va a verbale e il pin si
// colloca a S2c, quando il contratto promise Q3.A viene cablato.
// ============================================================

function wp1Element(client_op_id, id) {
  const el = makeElement("presa", client_op_id, [logRow(1, "2026-07-22", 1)]);
  if (id != null) el.id = id;
  return el;
}

describe("LocalRepository -- sonda WP1 (transazione indivisibile a due store)", () => {
  it("fallimento ESTERNO: registro e outbox rollbackano ENTRAMBI", async () => {
    let caught = null;
    try {
      await repo.withTransaction("rw", ["log_assunzioni", "outbox"], async () => {
        await db.log_assunzioni.add({
          farmaco_id: 1,
          data: "2026-07-22",
          dose_numero: 1,
          stato: "presa",
        });
        await repo.outboxEnqueue([wp1Element("uuid-wp1a")]);
        throw new Error("WP1: fallimento forzato DOPO entrambe le scritture");
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    // Invariante clinico: o tutto o nulla, su ENTRAMBI gli store.
    expect(await db.log_assunzioni.count()).toBe(0);
    expect((await repo.outboxCounts())).toEqual({ pending: 0, parked: 0 });

    // MISURA (non pin): quale codice raggiunge il chiamante.
    expect(typeof caught.code).toBe("string");
    expect(caught.code.length).toBeGreaterThan(0);
    console.log("WP1-a codice al chiamante:", caught.code);
  });

  it("fallimento INTERNO a outboxEnqueue: rollback del registro + codice misurato", async () => {
    // Precondizione: un elemento gia in coda, cosi il bulkAdd successivo
    // con id esplicito duplicato fallisce DENTRO outboxEnqueue, dove lo
    // errore viene gia avvolto dal suo _wrap (questo e WP1-bis).
    const [existingId] = await repo.outboxEnqueue([wp1Element("uuid-wp1-pre")]);

    let caught = null;
    try {
      await repo.withTransaction("rw", ["log_assunzioni", "outbox"], async () => {
        await db.log_assunzioni.add({
          farmaco_id: 2,
          data: "2026-07-22",
          dose_numero: 1,
          stato: "presa",
        });
        await repo.outboxEnqueue([wp1Element("uuid-wp1b", existingId)]);
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    // Il registro rollbacka: la riga scritta prima del fallimento sparisce.
    expect(await db.log_assunzioni.count()).toBe(0);
    // La coda torna al solo elemento pre-esistente (nessun doppione).
    expect((await repo.outboxCounts()).pending).toBe(1);

    expect(typeof caught.code).toBe("string");
    console.log("WP1-b codice al chiamante:", caught.code);
  });
});

// ============================================================
// SONDA WP5 -- upsertLogsBatch ANNIDATA nella transazione del tocco
// (par.22.198-tretriginties / S2c-1 punto a0). SENTINEL_S2C1_WP5_PROBE
// ------------------------------------------------------------
// Domanda misurata: `upsertLogsBatch` apre una transazione PROPRIA
// `db.transaction("rw", db.log_assunzioni, ...)` (LocalRepository.js:378).
// Nel punto (c) di S2c-2 quella transazione finisce ANNIDATA dentro il
// padre a DUE store aperto da withTransaction("rw", [log_assunzioni,
// outbox]). Scope sottoinsieme: legale in Dexie IN TEORIA, mai misurato
// in casa. Lesson #56/#57: si misura, non si deduce.
//
// Se WP5 risultasse RED il punto (c) cambierebbe FORMA -- il tocco
// dovrebbe scrivere il registro senza passare da upsertLogsBatch, oppure
// upsertLogsBatch dovrebbe diventare scope-aware -- e il cablaggio
// andrebbe ridisegnato PRIMA di scriverlo. Per questo la sonda precede
// ogni costruzione.
//
// WP5-c misura il rovescio: un padre che NON include `outbox` deve
// FALLIRE. E il movente misurato di WP2, cioe dello allargamento
// esplicito di scope che il punto (f) pretende da mirrorLogWindow.
// ============================================================

describe("LocalRepository -- sonda WP5 (upsertLogsBatch annidata nel tocco)", () => {
  it("WP5-a: upsertLogsBatch nel padre a due store COMPLETA e committa", async () => {
    let thrown = null;
    try {
      await repo.withTransaction("rw", ["log_assunzioni", "outbox"], async () => {
        await repo.upsertLogsBatch([logRow(1, "2026-07-23", 1, "presa")]);
        await repo.outboxEnqueue([
          makeElement("presa", "uuid-wp5a", [logRow(1, "2026-07-23", 1)]),
        ]);
      });
    } catch (err) {
      thrown = err;
    }

    if (thrown) {
      console.log("WP5-a ESITO: RED --", thrown.code, "--", thrown.message);
    } else {
      console.log("WP5-a ESITO: GREEN -- sub-transaction annidata legale");
    }

    expect(thrown).toBeNull();
    expect(await db.log_assunzioni.count()).toBe(1);
    expect((await repo.outboxCounts()).pending).toBe(1);
  });

  it("WP5-b: fallimento ESTERNO dopo la annidata -> rollback di ENTRAMBI", async () => {
    let caught = null;
    try {
      await repo.withTransaction("rw", ["log_assunzioni", "outbox"], async () => {
        await repo.upsertLogsBatch([logRow(2, "2026-07-23", 1, "presa")]);
        await repo.outboxEnqueue([
          makeElement("presa", "uuid-wp5b", [logRow(2, "2026-07-23", 1)]),
        ]);
        throw new Error("WP5: fallimento forzato DOPO entrambe le scritture");
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    // Invariante clinico del tocco indivisibile: o tutto o nulla.
    // Se la sub-transaction committasse per conto proprio, il registro
    // conserverebbe una presa senza il suo elemento di coda: mai spedita
    // e mai segnalata (M2).
    expect(await db.log_assunzioni.count()).toBe(0);
    expect(await repo.outboxCounts()).toEqual({ pending: 0, parked: 0 });

    console.log("WP5-b codice al chiamante:", caught.code);
  });

  it("WP5-c: padre SENZA outbox nello scope -> FALLISCE (movente di WP2)", async () => {
    let thrown = null;
    try {
      await repo.withTransaction("rw", ["log_assunzioni"], async () => {
        await repo.upsertLogsBatch([logRow(3, "2026-07-23", 1, "presa")]);
        await repo.outboxEnqueue([
          makeElement("presa", "uuid-wp5c", [logRow(3, "2026-07-23", 1)]),
        ]);
      });
    } catch (err) {
      thrown = err;
    }

    console.log(
      "WP5-c ESITO:",
      thrown ? "SOLLEVA -- " + thrown.code : "NON SOLLEVA"
    );

    expect(thrown).not.toBeNull();
    // Il registro non resta scritto a meta: la sub-transaction annidata
    // muore col padre.
    expect(await db.log_assunzioni.count()).toBe(0);
  });
});
