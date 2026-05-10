// @vitest-environment node
//
// Populate + defensive upgrade integration test for §6.196 (Sessione 5
// v3.0.0 fix cold-boot DB-vuoto).
//
// Verifies that:
//  1. Fresh install (DB inesistente) triggers the on('populate') hook
//     and inserts the default Standard profilo, satisfying the init()
//     invariant `profili.find(p => p.attivo) !== undefined` at cold-boot.
//  2. Defensive v2→v3 upgrade on an empty profilo_utente store inserts
//     Standard (theoretical corrupted-state recovery).
//  3. Defensive v2→v3 upgrade on a populated profilo_utente store is a
//     no-op — preserves existing user data without duplicating profili.
//
// Uses fake-indexeddb to run hermetic IDB integration tests in Node.
// Test DB name is distinct from the production singleton ("pharmatimer")
// to guarantee zero side-effects on other test files.
// Schema is duplicated here (not imported from db.js) to keep the test
// hermetic — production singleton state stays untouched. Mirrors the
// pattern of db.migration.test.js (§6.117).

import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_DB_NAME = "pharmatimer-populate-test";

// Single source of truth for the Standard profilo shape — mirrors the
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

// v1 schema replica — pre-§6.117 (no upgrade hooks)
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

// v4 schema replica with all upgrade hooks (v1->v2 §6.117 ora_ricalcolata,
// v2->v3 §6.196 defensive Standard insert, v3->v4 §6.203 detect-and-merge)
// AND populate hook — mirrors src/data/db.js exactly.
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
  db.on("populate", async (tx) => {
    // §6.196 — fresh install always gets a Standard profilo.
    await tx.table("profilo_utente").add({ ...EXPECTED_STANDARD });
  });
  return db;
}

const wipeDb = () =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(TEST_DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });

describe("db populate + defensive upgrade — §6.196 fix cold-boot DB-vuoto", () => {
  beforeEach(async () => {
    await wipeDb();
  });

  afterEach(async () => {
    await wipeDb();
  });

  it("dovrebbe inserire un profilo Standard al primo open di un DB inesistente (fresh install)", async () => {
    const db = openDbV4();
    await db.open();
    const profili = await db.table("profilo_utente").toArray();
    db.close();

    expect(profili).toHaveLength(1);
    // Semantic mirror of init() line 151: profili.find((p) => p.attivo)
    // must return a defined record at cold-boot, otherwise NO_ACTIVE_PROFILE
    // is thrown and OnboardingGate cannot open. This assertion guarantees
    // the bug from §22.47 P1 cannot reproduce.
    const profiloAttivo = profili.find((p) => p.attivo);
    expect(profiloAttivo).toBeDefined();
    expect(profiloAttivo.nome_profilo).toBe("Standard");
    expect(profiloAttivo.attivo).toBe(1);
    expect(profiloAttivo.demo).toBe(0);
    // Full shape check — single source of truth for the Standard profilo.
    expect(profiloAttivo).toMatchObject(EXPECTED_STANDARD);
  });

  it("dovrebbe inserire un profilo Standard nell'upgrade v1→v3 su DB v1 vuoto (defensive recovery)", async () => {
    // Open v1 without inserting any profilo — simulates a corrupted-state
    // browser stuck at v1 with no profili.
    const dbV1 = openDbV1();
    await dbV1.open();
    const v1Profili = await dbV1.table("profilo_utente").toArray();
    expect(v1Profili).toHaveLength(0); // baseline: empty
    dbV1.close();

    // Bump to v3 — populate hook does NOT fire (DB already exists),
    // but the v3 upgrade hook detects empty profilo_utente and inserts
    // Standard.
    const dbV3 = openDbV4();
    await dbV3.open();
    const v3Profili = await dbV3.table("profilo_utente").toArray();
    dbV3.close();

    expect(v3Profili).toHaveLength(1);
    expect(v3Profili[0]).toMatchObject(EXPECTED_STANDARD);
  });

  it("non dovrebbe duplicare profili nell'upgrade v1→v3 se profilo_utente è già popolato (preserva dati utente esistenti)", async () => {
    // Open v1 and insert a custom profilo — simulates an existing user
    // (e.g., Roberto) whose DB was provisioned by the legacy seed
    // auto-bootstrap or by manual creation.
    const dbV1 = openDbV1();
    await dbV1.open();
    await dbV1.table("profilo_utente").add({
      nome_profilo: "Roberto",
      ora_sveglia: "06:30",
      ora_colazione: "07:00",
      ora_pranzo: "12:30",
      ora_cena: "19:30",
      ora_sonno: "23:00",
      attivo: 1,
      demo: 0,
    });
    dbV1.close();

    // Bump to v3 — the v3 upgrade hook MUST be a no-op because
    // profilo_utente.count() === 1, otherwise we would inject a
    // duplicate Standard and break the "one active profile" invariant.
    const dbV3 = openDbV4();
    await dbV3.open();
    const profili = await dbV3.table("profilo_utente").toArray();
    dbV3.close();

    expect(profili).toHaveLength(1); // exactly 1, no duplication
    expect(profili[0].nome_profilo).toBe("Roberto"); // user data intact
    expect(profili[0].ora_sveglia).toBe("06:30");
    expect(profili[0].attivo).toBe(1);
  });

  // §6.204 (CP3 test +2) — flow demo bulkPut idempotenza post-§6.202 fix
  it("dovrebbe mantenere count=1 dopo flow demo (populate + bulkPut con id:1 esplicito, §6.202 fix)", async () => {
    const db = openDbV4();
    await db.open();
    // Populate inserts id=1 demo:0 (cold-boot Standard)
    let profili = await db.table("profilo_utente").toArray();
    expect(profili).toHaveLength(1);
    expect(profili[0].demo).toBe(0);

    // Simulate runSeedIfNeeded({force:true}) — bulkPut con id:1 esplicito
    // (§6.202 fix in seed.js). Dexie REPLACE in-place atteso, no duplicazione.
    await db.table("profilo_utente").bulkPut([{
      ...EXPECTED_STANDARD,
      id: 1,
      demo: 1,
    }]);

    profili = await db.table("profilo_utente").toArray();
    db.close();

    expect(profili).toHaveLength(1); // REPLACE, no INSERT
    expect(profili[0].id).toBe(1);
    expect(profili[0].demo).toBe(1); // overwritten 0 -> 1
    expect(profili[0].attivo).toBe(1);
  });

  it("dovrebbe restare a count=1 dopo bulkPut multipli con id:1 (idempotenza ri-seed)", async () => {
    const db = openDbV4();
    await db.open();

    const seedProfilo = { ...EXPECTED_STANDARD, id: 1, demo: 1 };

    // 3 bulkPut consecutive simulano ri-seed multiplo (es. user reset
    // + onboarding-demo eseguito piu volte). Atteso: count=1 stabile.
    await db.table("profilo_utente").bulkPut([seedProfilo]);
    await db.table("profilo_utente").bulkPut([seedProfilo]);
    await db.table("profilo_utente").bulkPut([seedProfilo]);

    const profili = await db.table("profilo_utente").toArray();
    db.close();

    expect(profili).toHaveLength(1);
    expect(profili[0].id).toBe(1);
    expect(profili[0].demo).toBe(1);
  });
});
