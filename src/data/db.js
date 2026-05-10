import Dexie from "dexie";

// ============================================================
// Dexie schema — mirrors PharmaTimer_Project_Spec.md section 3.
// Table names and field names match the spec exactly (Italian).
// Code and comments are in English as per project rules.
// ============================================================
//
// Object stores:
//   farmaci          — medication registry (spec 3.1)
//   orari_base       — scheduled doses per day, as offsets from anchors (spec 3.5)
//   log_assunzioni   — per-day dose log (spec 3.6)
//   profilo_utente   — daily-rhythm profiles, one active at a time (spec 3.4)
//   impostazioni_app — key/value app settings (nome_utente, etc.) — NEW, not in spec
//
// Notes:
// - Dexie uses auto-incrementing primary keys with `++id`.
// - Indexes are declared for fields we actively query: `attivo`,
//   `farmaco_id`, `data`, and the `[farmaco_id+data]` composite for the
//   per-day lookup in log_assunzioni.
// - Booleans in IndexedDB are stored as 0/1 for indexability (Dexie
//   does not index booleans directly).

export const DB_NAME = "pharmatimer";
export const DB_VERSION = 4;

export const db = new Dexie(DB_NAME);

// ============================================================
// §6.196 — Default "Standard" profilo (Sessione 5 v3.0.0 fix cold-boot)
// ------------------------------------------------------------
// Single source of truth for the baseline profilo_utente record
// inserted on fresh install (Dexie populate hook) and as defensive
// upgrade target (v2→v3). Shape mirrors actions.js resetAllData
// (§6.180 CP6 v3.0.0 Step 1, line ~1018) — not seed.js, because
// seed.js uses demo:1 (a demo-data marker), while this Standard
// profilo is the user-baseline at cold-boot (demo:0).
//
// Subsequent runSeedIfNeeded({force:true}) in mode='demo' uses
// bulkPut on profilo_utente, overwriting Standard idempotently
// without error if the user later opts into the demo flow.
// ============================================================
const DEFAULT_PROFILO_STANDARD = {
  nome_profilo: "Standard",
  ora_sveglia: "07:00",
  ora_colazione: "07:30",
  ora_pranzo: "13:00",
  ora_cena: "20:30",
  ora_sonno: "23:30",
  attivo: 1,
  demo: 0,
};

db.version(1).stores({
  // PK id, indexes: attivo (for "active meds" queries)
  farmaci: "++id, attivo",

  // PK id, indexes: farmaco_id (to fetch all doses of a med),
  // composite [farmaco_id+dose_numero] for uniqueness checks
  orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",

  // PK id, indexes: data (daily view), farmaco_id, composite for fast
  // "all log entries of farmaco X on day Y" queries
  log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",

  // PK id, indexes: attivo (only one active profile at a time)
  profilo_utente: "++id, attivo",

  // Key/value settings. PK is the key itself (string).
  impostazioni_app: "chiave"
});

// ============================================================
// Schema v2 — Sessione 9-A (§6.117, AMB-9.B/C)
// ------------------------------------------------------------
// Stores are byte-identical to v1; the version bump exists solely
// to trigger the upgrade hook below, which migrates the type of
// `log_assunzioni.ora_ricalcolata` from HH:MM to ISO 'YYYY-MM-DDTHH:MM'.
// Rationale: cross-midnight recalcs (§6.18) need a date-aware string.
// AMB-9.B accepts a simple `length === 5` heuristic to detect legacy
// values and rebuilds ISO by prepending the row's `data` field.
// Cross-midnight legacy entries self-heal at the next apply* call
// (no rollback strategy; `__pt.wipe()` is the documented escape hatch
// per §6.113).
// ============================================================
db.version(2).stores({
  // Identical to v1 — schema bump exists for upgrade hook only
  farmaci: "++id, attivo",
  orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
  log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
  profilo_utente: "++id, attivo",
  impostazioni_app: "chiave"
}).upgrade(async (tx) => {
  // §6.117 — Migrate ora_ricalcolata HH:MM (legacy) → ISO 'YYYY-MM-DDTHH:MM'.
  await tx.table("log_assunzioni").toCollection().modify((log) => {
    if (log.ora_ricalcolata && log.ora_ricalcolata.length === 5) {
      log.ora_ricalcolata = log.data + "T" + log.ora_ricalcolata;
    }
  });
});

// ============================================================
// Schema v3 — Sessione 5 v3.0.0 (§6.196, fix cold-boot)
// ------------------------------------------------------------
// Stores byte-identical to v2; the version bump exists solely to
// trigger the defensive upgrade hook below, which guarantees that
// any browser that opened the DB at v1/v2 without a Standard profilo
// (theoretical edge case — never observed in practice but logically
// possible) gets one inserted before init() runs.
//
// Production fix is the on('populate') hook below (covers fresh
// installs, the actual reproducible bug case). The v2→v3 upgrade
// is defensive — it only inserts Standard if profilo_utente is
// still empty when this hook runs, so it cannot create duplicates
// for users whose DB already has profili (Roberto's existing data
// stays intact).
//
// Closes the cold-boot DB-vuoto bug discovered in §22.47 P1 of the
// Sessione 4 browser checklist:
//   - root cause: actions.js init() throws NO_ACTIVE_PROFILE on
//     `profili.find(p => p.attivo) === undefined`, blocking the
//     OnboardingGate (which requires status === 'ready').
//   - prior consciousness: actions.js:1013 comment in resetAllData
//     (§6.180) shows the problem was known but mitigated only in
//     that one path — never generalised for fresh installs.
// ============================================================
db.version(3).stores({
  // Identical to v2 — schema bump exists for upgrade hook only
  farmaci: "++id, attivo",
  orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
  log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
  profilo_utente: "++id, attivo",
  impostazioni_app: "chiave"
}).upgrade(async (tx) => {
  // §6.196 — Defensive: insert Standard only if profilo_utente is
  // empty. Real-world users coming from v2 already have profili
  // (either from old seed auto-bootstrap or from Roberto's existing
  // data); this branch handles the theoretical corrupted-state case.
  const existing = await tx.table("profilo_utente").count();
  if (existing === 0) {
    await tx.table("profilo_utente").add({ ...DEFAULT_PROFILO_STANDARD });
  }
});

// ============================================================
// §6.203 — Schema v4 (Sessione 8 v3.0.0 fix double-profile)
// ------------------------------------------------------------
// Stores byte-identical to v3; the version bump exists solely to
// trigger the detect-and-merge upgrade hook below, which restores
// the spec §3.4 invariant "one active profilo at a time" for any
// installed DB carrying the §6.201 double-profile bug (2 records
// with attivo:1 produced by the bulkPut id-implicit pattern in
// runSeedIfNeeded — closed at source by §6.202 in seed.js).
//
// Tie-break order (deterministic):
//   1. Records with demo:1 win over demo:0 — the demo flow is the
//      most recent explicit user choice (completeOnboarding('demo'))
//      and represents intentional state.
//   2. Within the same demo tier, lowest id wins — stable and
//      matches the populate hook convention "Standard is id=1
//      by-design" (§6.196).
//   3. Losers are bulkDelete'd in a single transactional sweep.
//
// Idempotent: profilo_utente with <=1 active record → no-op. Safe
// to re-apply (e.g. after manual DB inspection by the user).
// Closes §6.201 / §22.49 retroactively for any DB at v3.
// ============================================================
db.version(4).stores({
  // Identical to v3 — schema bump exists for upgrade hook only
  farmaci: "++id, attivo",
  orari_base: "++id, farmaco_id, [farmaco_id+dose_numero]",
  log_assunzioni: "++id, data, farmaco_id, [farmaco_id+data]",
  profilo_utente: "++id, attivo",
  impostazioni_app: "chiave"
}).upgrade(async (tx) => {
  // §6.203 — Detect double-active profili and merge to single survivor.
  const attivi = await tx.table("profilo_utente")
    .where("attivo").equals(1).toArray();
  if (attivi.length <= 1) return; // no-op idempotente

  // Tie-break: demo:1 first (most recent intent), then id ASC (stable).
  // Defensive (a.demo ?? 0) for legacy records lacking the demo field.
  const sorted = [...attivi].sort((a, b) => {
    if ((a.demo ?? 0) !== (b.demo ?? 0)) return (b.demo ?? 0) - (a.demo ?? 0);
    return a.id - b.id;
  });

  const losers = sorted.slice(1).map((p) => p.id);
  if (losers.length > 0) {
    await tx.table("profilo_utente").bulkDelete(losers);
  }
});

// ============================================================
// §6.196 — Populate hook for fresh installs.
// ------------------------------------------------------------
// Fires exactly once when the DB is first created (no version exists
// yet in the browser). Inserts the default Standard profilo so init()
// always finds an active profilo on cold-boot.
//
// This is the production fix path: every new install lands here and
// gets a profilo by-design, eliminating the NO_ACTIVE_PROFILE throw
// permanently. The init() invariant
// (`profili.find(p => p.attivo) !== undefined`) becomes a true
// system invariant, not a mere assumption.
// ============================================================
db.on("populate", async (tx) => {
  await tx.table("profilo_utente").add({ ...DEFAULT_PROFILO_STANDARD });
});

// ============================================================
// Settings keys — centralized to avoid typos.
// §6.129 (Sessione 9-B parte 2/2): NOTIFICHE_ATTIVE added for the
// Wave B notifications toggle. Stored as 0/1 (not boolean) per the
// IndexedDB indexability convention.
// ============================================================
export const SETTINGS_KEYS = {
  NOME_UTENTE: "nome_utente",
  SEED_LOADED: "seed_loaded",      // boolean: first-run seed already executed
  SCHEMA_VERSION: "schema_version",// future-proofing for data migrations
  NOTIFICHE_ATTIVE: "notifiche_attive", // 0/1: master switch for Wave B notifications (§6.129)
  ONBOARDING_COMPLETED: "onboarding_completed" // 0/1: gates OnboardingModal mount (§6.165, CP2 v3.0.0 Step 1)
};
