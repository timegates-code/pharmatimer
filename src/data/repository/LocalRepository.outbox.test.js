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
