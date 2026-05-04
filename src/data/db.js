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
export const DB_VERSION = 2;

export const db = new Dexie(DB_NAME);

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
