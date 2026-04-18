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
export const DB_VERSION = 1;

export const db = new Dexie(DB_NAME);

db.version(DB_VERSION).stores({
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
// Settings keys — centralized to avoid typos.
// ============================================================
export const SETTINGS_KEYS = {
  NOME_UTENTE: "nome_utente",
  SEED_LOADED: "seed_loaded",      // boolean: first-run seed already executed
  SCHEMA_VERSION: "schema_version" // future-proofing for data migrations
};
