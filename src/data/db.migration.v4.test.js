// @vitest-environment node
//
// Migration integration test for §6.203 (Sessione 8 v3.0.0 fix
// double-profile §6.201). Verifies that bumping Dexie schema v3 → v4
// triggers the detect-and-merge upgrade hook, restoring the spec §3.4
// invariant "one active profilo at a time" for installed DBs that
// carried the §6.201 double-profile bug (2 records with attivo:1).
//
// Tie-break order ratified in §22.50 Q2:
//   1. Records with demo:1 win over demo:0 (most recent user intent).
//   2. Within the same demo tier, lowest id wins (stable, matches
//      §6.196 convention "Standard is id=1 by-design").
//   3. Losers are bulkDelete'd in a single transactional sweep.
//
// Idempotent: profilo_utente with <=1 active record → no-op.
//
// Uses fake-indexeddb to run hermetic IDB integration tests in Node.
// Test DB name is distinct from the production singleton ("pharmatimer")
// to guarantee zero side-effects on other test files.
// Schema is duplicated here (not imported from db.js) to keep the test
// hermetic — production singleton state stays untouched. Mirrors the
// pattern of db.migration.test.js (§6.117) and db.populate.test.js
// (§6.196).

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_DB_NAME = "pharmatimer-mig-v4-test";

// Single source of truth for the Standard profilo shape — mirrors
// production const DEFAULT_PROFILO_STANDARD in src/data/db.js.
const EXPECTED_STANDARD = {
  nome_profilo: "Standard",
  ora_sveglia: "07:00",
  ora_colazione: "07:30",
  ora_pranzo: "13:00",
  ora_cena: "20:30",
  ora_sonno: "23:30",
  attivo: 1,
  demo: 0,
};

// v3 schema replica WITHOUT populate hook — used to seed the
// double-profile bug state manually for migration testing.
// (The populate hook would auto-insert a single Standard record on
// fresh install, hiding the multi-record state we need to test.)
function openDbV3() {
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
    // §6.117 — ora_ricalcolata HH:MM → ISO migration.
    await tx.table("log_assunzioni").toCollection().modify((log) => {
      if (log.ora_ricalcolata && log.ora_ricalcolata.length === 5) {
        log.ora_ricalcolata = log.data + "T" + log.ora_ricalcolata;
      }
    });
  });
  db.version(3).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  }).upgrade(async (tx) => {
    // §6.196 — defensive insert if profilo_utente is empty.
    const existing = await tx.table("profilo_utente").count();
    if (existing === 0) {
      await tx.table("profilo_utente").add({ ...EXPECTED_STANDARD });
    }
  });
  return db;
}

// v4 schema replica — extends v3 with the §6.203 detect-and-merge
// upgrade hook. Mirrors src/data/db.js exactly.
function openDbV4() {
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
  db.version(3).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  }).upgrade(async (tx) => {
    const existing = await tx.table("profilo_utente").count();
    if (existing === 0) {
      await tx.table("profilo_utente").add({ ...EXPECTED_STANDARD });
    }
  });
  db.version(4).stores({
    farmaci: "++id, attivo",
    orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
    log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
    profilo_utente: "++id, attivo",
    impostazioni_app: "chiave",
  }).upgrade(async (tx) => {
    // §6.203 — detect double-active profili and merge to single survivor.
    const attivi = await tx.table("profilo_utente")
      .where("attivo").equals(1).toArray();
    if (attivi.length <= 1) return;
    const sorted = [...attivi].sort((a, b) => {
      if ((a.demo ?? 0) !== (b.demo ?? 0)) return (b.demo ?? 0) - (a.demo ?? 0);
      return a.id - b.id;
    });
    const losers = sorted.slice(1).map((p) => p.id);
    if (losers.length > 0) {
      await tx.table("profilo_utente").bulkDelete(losers);
    }
  });
  return db;
}

const wipeDb = () =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(TEST_DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });

describe("db migration v3→v4 — §6.203 detect-and-merge double-profile", () => {
  beforeEach(async () => {
    await wipeDb();
  });

  afterEach(async () => {
    await wipeDb();
  });

  it("dovrebbe preservare il record demo:1 nel merge v3→v4 con 2 record attivi (decisione utente piu recente)", async () => {
    // Setup: simulate Roberto's bug state — 2 active profili with
    // different demo tiers (the canonical §6.201 reproduction).
    const dbV3 = openDbV3();
    await dbV3.open();
    // id=1, demo:0 (from cold-boot Standard, hypothetical)
    await dbV3.table("profilo_utente").add({
      id: 1,
      ...EXPECTED_STANDARD,
      demo: 0,
    });
    // id=2, demo:1 (from runSeedIfNeeded bulkPut id-implicit, pre-§6.202)
    await dbV3.table("profilo_utente").add({
      id: 2,
      ...EXPECTED_STANDARD,
      demo: 1,
    });
    const v3State = await dbV3.table("profilo_utente").toArray();
    expect(v3State).toHaveLength(2); // baseline: bug state
    dbV3.close();

    // Trigger v4 upgrade
    const dbV4 = openDbV4();
    await dbV4.open();
    const v4State = await dbV4.table("profilo_utente").toArray();
    dbV4.close();

    // demo:1 wins over demo:0 — id=2 preserved, id=1 deleted
    expect(v4State).toHaveLength(1);
    expect(v4State[0].id).toBe(2);
    expect(v4State[0].demo).toBe(1);
    expect(v4State[0].attivo).toBe(1);
  });

  it("dovrebbe preservare il record id ASC nel merge v3→v4 con 2 record attivi entrambi demo:0 (tie-break stable)", async () => {
    // Edge case: both records same demo tier — id ASC tie-break.
    const dbV3 = openDbV3();
    await dbV3.open();
    await dbV3.table("profilo_utente").add({
      id: 1,
      ...EXPECTED_STANDARD,
      demo: 0,
    });
    await dbV3.table("profilo_utente").add({
      id: 2,
      ...EXPECTED_STANDARD,
      nome_profilo: "Standard duplicato",
      demo: 0,
    });
    expect(await dbV3.table("profilo_utente").count()).toBe(2);
    dbV3.close();

    const dbV4 = openDbV4();
    await dbV4.open();
    const v4State = await dbV4.table("profilo_utente").toArray();
    dbV4.close();

    // id=1 wins (lowest id, both demo:0)
    expect(v4State).toHaveLength(1);
    expect(v4State[0].id).toBe(1);
    expect(v4State[0].nome_profilo).toBe("Standard");
  });

  it("non dovrebbe modificare nulla nel merge v3→v4 con 1 solo record attivo (no-op idempotente)", async () => {
    // Healthy state: single active profilo. Hook must be no-op.
    const dbV3 = openDbV3();
    await dbV3.open();
    await dbV3.table("profilo_utente").add({
      id: 1,
      ...EXPECTED_STANDARD,
      demo: 0,
    });
    expect(await dbV3.table("profilo_utente").count()).toBe(1);
    dbV3.close();

    const dbV4 = openDbV4();
    await dbV4.open();
    const v4State = await dbV4.table("profilo_utente").toArray();
    dbV4.close();

    // No change — record id=1 preserved as-is
    expect(v4State).toHaveLength(1);
    expect(v4State[0].id).toBe(1);
    expect(v4State[0].nome_profilo).toBe("Standard");
    expect(v4State[0].demo).toBe(0);
    expect(v4State[0].attivo).toBe(1);
  });
});
