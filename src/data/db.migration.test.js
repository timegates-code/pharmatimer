// @vitest-environment node
//
// Migration integration test for §6.117 (Sessione 9-A, AMB-9.B/C).
// Verifies that bumping Dexie schema v1 → v2 transforms legacy
// `ora_ricalcolata` HH:MM strings into ISO 'YYYY-MM-DDTHH:MM'.
//
// Uses fake-indexeddb to run hermetic IDB integration tests in Node.
// Test DB name is distinct from the production singleton ("pharmatimer")
// to guarantee zero side-effects on other test files.
// Schema is duplicated here (not imported from db.js) to keep the test
// hermetic — production singleton state stays untouched.

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_DB_NAME = "pharmatimer-mig-test";

// v1 schema replica — pre-§6.117, ora_ricalcolata HH:MM
function openDbV1() {
  const db = new Dexie(TEST_DB_NAME);
  db.version(1).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  });
  return db;
}

// v2 schema replica — post-§6.117, ora_ricalcolata ISO via upgrade hook.
// Mirrors src/data/db.js exactly.
function openDbV2() {
  const db = new Dexie(TEST_DB_NAME);
  db.version(1).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  });
  db.version(2).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  }).upgrade(async (tx) => {
    await tx.table("log_assunzioni").toCollection().modify((log) => {
      if (log.ora_ricalcolata && log.ora_ricalcolata.length === 5) {
        log.ora_ricalcolata = log.data + "T" + log.ora_ricalcolata;
      }
    });
  });
  return db;
}

const wipeDb = () =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(TEST_DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });

describe("db migration v1→v2 — §6.117 ora_ricalcolata HH:MM → ISO", () => {
  beforeEach(async () => {
    await wipeDb();
  });

  afterEach(async () => {
    await wipeDb();
  });

  it("dovrebbe migrare ora_ricalcolata HH:MM legacy a ISO 'YYYY-MM-DDTHH:MM'", async () => {
    const dbV1 = openDbV1();
    await dbV1.open();
    await dbV1.table("log_assunzioni").add({
      farmaco_id: 1,
      data: "2026-04-26",
      dose_numero: 1,
      ora_prevista: "23:00",
      stato: "ricalcolata",
      ora_ricalcolata: "07:00",
      gap_minuti: 0,
      recupero_minuti: 0,
    });
    dbV1.close();

    const dbV2 = openDbV2();
    await dbV2.open();
    const all = await dbV2.table("log_assunzioni").toArray();
    expect(all).toHaveLength(1);
    expect(all[0].ora_ricalcolata).toBe("2026-04-26T07:00");
    dbV2.close();
  });

  it("dovrebbe lasciare invariato ora_ricalcolata già in formato ISO (no double-migration)", async () => {
    const dbV2 = openDbV2();
    await dbV2.open();
    await dbV2.table("log_assunzioni").add({
      farmaco_id: 1,
      data: "2026-04-26",
      dose_numero: 1,
      ora_prevista: "23:00",
      stato: "ricalcolata",
      ora_ricalcolata: "2026-04-27T07:00",
      gap_minuti: 0,
      recupero_minuti: 0,
    });
    dbV2.close();

    const dbV2b = openDbV2();
    await dbV2b.open();
    const all = await dbV2b.table("log_assunzioni").toArray();
    expect(all[0].ora_ricalcolata).toBe("2026-04-27T07:00");
    dbV2b.close();
  });

  it("dovrebbe preservare ora_ricalcolata=null (entry presa/saltata/sospesa non toccate)", async () => {
    const dbV1 = openDbV1();
    await dbV1.open();
    await dbV1.table("log_assunzioni").add({
      farmaco_id: 1,
      data: "2026-04-26",
      dose_numero: 1,
      ora_prevista: "08:00",
      stato: "presa",
      ora_effettiva: "08:05",
      ora_ricalcolata: null,
      delta_minuti: 5,
      gap_minuti: 5,
      recupero_minuti: 0,
    });
    dbV1.close();

    const dbV2 = openDbV2();
    await dbV2.open();
    const all = await dbV2.table("log_assunzioni").toArray();
    expect(all[0].ora_ricalcolata).toBeNull();
    dbV2.close();
  });
});
