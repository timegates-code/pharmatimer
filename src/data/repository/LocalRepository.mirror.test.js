// @vitest-environment node
// ============================================================
// LocalRepository — mirror write-path integration tests (CS-3).
// ============================================================
// par.22.198-sexvicies. Exercises mirrorFarmaci / mirrorOrari /
// mirrorLogWindow against REAL Dexie under fake-indexeddb, so the
// reconciliation semantics (soft-delete, windowed replace, invariant
// preservation) are verified on the production code path — not a stub.
//
// Divergence from the schema-duplicating db tests (db.migration*.test.js,
// db.populate.test.js): those rebuild the schema under a distinct DB name
// to leave the production singleton untouched. Here we DELIBERATELY use
// the real `db` singleton + real LocalRepository, because the methods
// under test are bound to that singleton. fake-indexeddb (in-memory,
// hermetic) + per-file vitest isolation + a beforeEach clear keep it safe.
//
// Order matters: `fake-indexeddb/auto` MUST be the first import so the
// global indexedDB exists before db.js performs any operation.

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";
import { LocalRepository } from "./LocalRepository.js";

const repo = new LocalRepository();

beforeEach(async () => {
  if (!db.isOpen()) {
    await db.open();
  }
  await db.transaction(
    "rw",
    db.farmaci,
    db.orari_base,
    db.log_assunzioni,
    async () => {
      await db.farmaci.clear();
      await db.orari_base.clear();
      await db.log_assunzioni.clear();
    }
  );
});

describe("LocalRepository.mirrorFarmaci", () => {
  it("upsert degli attivi + assente->attivo=0 (mai hard-delete)", async () => {
    await db.farmaci.bulkPut([
      { id: 1, nome: "Alpha", attivo: 1 },
      { id: 2, nome: "Beta", attivo: 1 },
    ]);
    // Server returns only id=1 (id=2 soft-deleted server-side).
    await repo.mirrorFarmaci([{ id: 1, nome: "Alpha2", attivo: 1 }]);

    const all = await db.farmaci.orderBy("id").toArray();
    expect(all.length).toBe(2); // id=2 NOT hard-deleted

    const f1 = all.find((f) => f.id === 1);
    const f2 = all.find((f) => f.id === 2);
    expect(f1.nome).toBe("Alpha2"); // upserted with server payload
    expect(f2.attivo).toBe(0); // reconciled to soft-deleted
    expect(f2.nome).toBe("Beta"); // name preserved for Cronologia
  });

  it("input non-array trattato come vuoto (nessun crash)", async () => {
    await db.farmaci.bulkPut([{ id: 1, nome: "Alpha", attivo: 1 }]);
    await repo.mirrorFarmaci(undefined);
    const f1 = await db.farmaci.get(1);
    expect(f1.attivo).toBe(0); // absent from empty server => soft-deleted
  });
});

describe("LocalRepository.mirrorOrari", () => {
  it("full replace (clear + bulkPut)", async () => {
    await db.orari_base.bulkPut([{ id: 10, farmaco_id: 1, dose_numero: 1 }]);
    await repo.mirrorOrari([
      { id: 20, farmaco_id: 2, dose_numero: 1 },
      { id: 21, farmaco_id: 2, dose_numero: 2 },
    ]);
    const all = await db.orari_base.orderBy("id").toArray();
    expect(all.map((o) => o.id)).toEqual([20, 21]); // old id=10 gone
  });
});

describe("LocalRepository.mirrorLogWindow", () => {
  it("rimpiazza in-finestra attivi; fuori-finestra e inattivi-in-finestra INTATTI", async () => {
    await db.log_assunzioni.bulkPut([
      { id: 1, farmaco_id: 10, data: "2026-07-10", stato: "prevista" }, // in-window, active -> replaced
      { id: 2, farmaco_id: 10, data: "2026-07-01", stato: "presa" }, // OUT of window -> intact
      { id: 3, farmaco_id: 99, data: "2026-07-10", stato: "presa" }, // in-window, inactive med -> intact
    ]);
    const server = [
      { id: 50, farmaco_id: 10, data: "2026-07-10", stato: "presa" },
    ];
    await repo.mirrorLogWindow(server, "2026-07-05", "2026-07-15");

    const all = await db.log_assunzioni.orderBy("id").toArray();
    expect(all.map((r) => r.id)).toEqual([2, 3, 50]); // id=1 removed, id=50 added
    expect((await db.log_assunzioni.get(2)).stato).toBe("presa"); // out-of-window intact
    expect((await db.log_assunzioni.get(3)).farmaco_id).toBe(99); // inactive-in-window intact
    expect((await db.log_assunzioni.get(50)).farmaco_id).toBe(10); // server row applied
  });

  it("invariante pinnata: il server non hard-delete (UPDATE in place)", async () => {
    // The current contract is that the server response carries EVERY
    // active-med log in the window (verbs are INSERT/UPDATE only). A
    // state transition arrives as the same logical row re-published;
    // the mirror replaces it in place.
    await db.log_assunzioni.bulkPut([
      { id: 1, farmaco_id: 10, data: "2026-07-10", stato: "presa" },
    ]);
    await repo.mirrorLogWindow(
      [{ id: 1, farmaco_id: 10, data: "2026-07-10", stato: "saltata" }],
      "2026-07-05",
      "2026-07-15"
    );
    const row = await db.log_assunzioni.get(1);
    expect(row.stato).toBe("saltata");
  });
});
