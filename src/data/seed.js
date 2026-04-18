import { db, SETTINGS_KEYS } from "./db.js";

// ============================================================
// Seed data — loaded on first app run only.
// Source: PharmaTimer_Project_Spec.md section 10 (example therapy).
// Presented to the user as "demo data, removable from Config".
// ============================================================
//
// All records have a `demo: 1` marker so the user can wipe them
// in one click from the Config view (Step 8).
// The flag is 0/1 (not boolean) because IndexedDB cannot index booleans.

// --- Daily-rhythm profiles (spec 3.4) ---
const PROFILI = [
  {
    nome_profilo: "Standard",
    ora_sveglia: "07:00",
    ora_colazione: "07:30",
    ora_pranzo: "13:00",
    ora_cena: "20:30",
    ora_sonno: "23:30",
    attivo: 1,
    demo: 1
  },
  {
    nome_profilo: "Nottambulo",
    ora_sveglia: "10:00",
    ora_colazione: "10:30",
    ora_pranzo: "14:30",
    ora_cena: "21:30",
    ora_sonno: "02:00",
    attivo: 0,
    demo: 1
  }
];

// --- Medications (spec 3.1, values from spec 10.2 and 10.3) ---
// `id` is explicit here to keep `orari_base` references stable.
const FARMACI = [
  // Chronic (no data_fine)
  { id: 1,  nome: "Pantorc 40mg", principio_attivo: "pantoprazolo", funzione: "Gastroprotezione",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "prima", dettaglio_pasto: "30 min prima colazione", note: null,
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 2,  nome: "Duoresp Spiromax 1 puff", principio_attivo: "budesonide/formoterolo", funzione: "Broncodilatatore + antinfiammatorio",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "prima", dettaglio_pasto: "prima di colazione", note: "Sciacquare bocca dopo",
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 3,  nome: "Giant 20/5mg", principio_attivo: "olmesartan/amlodipina", funzione: "Antipertensivo",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "durante", dettaglio_pasto: "durante colazione", note: null,
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 4,  nome: "Olevia 1000mg", principio_attivo: "omega-3", funzione: "Omega-3",
    tipo_frequenza: "intervallo", intervallo_ore: 12.0, intervallo_minimo_ore: 6.0, dosi_giornaliere: 2,
    relazione_pasto: "durante", dettaglio_pasto: "durante pasto", note: null,
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 5,  nome: "Normast 600mg", principio_attivo: "palmitoiletanolamide", funzione: "Neuroprotettore",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "durante", dettaglio_pasto: "durante colazione", note: null,
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 6,  nome: "Movicol", principio_attivo: "macrogol", funzione: "Regolarità intestinale",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "lontano", dettaglio_pasto: "lontano dai pasti", note: "Sciogliere in acqua",
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 7,  nome: "Ezevast 10/20mg", principio_attivo: "ezetimibe/rosuvastatina", funzione: "Statina (colesterolo)",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "dopo", dettaglio_pasto: "durante/dopo cena", note: null,
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  { id: 8,  nome: "Lyrica 75mg", principio_attivo: "pregabalin", funzione: "Dolore neuropatico",
    tipo_frequenza: "fisso", intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: "indifferente", dettaglio_pasto: null, note: "Rallenta i riflessi",
    data_inizio: "2024-01-01", data_fine: null, attivo: 1, demo: 1 },

  // Temporary (with data_fine)
  { id: 9,  nome: "Medrol 16mg", principio_attivo: "metilprednisolone", funzione: "Cortisone broncospasmo",
    tipo_frequenza: "intervallo", intervallo_ore: 6.0, intervallo_minimo_ore: 3.0, dosi_giornaliere: 2,
    relazione_pasto: "stomaco_pieno", dettaglio_pasto: "a stomaco pieno", note: null,
    data_inizio: "2026-04-15", data_fine: "2026-04-19", attivo: 1, demo: 1 },

  { id: 10, nome: "Prontinal aerosol 800mcg", principio_attivo: "beclometasone", funzione: "Corticosteroide inalatorio",
    tipo_frequenza: "intervallo", intervallo_ore: 8.0, intervallo_minimo_ore: 4.0, dosi_giornaliere: 3,
    relazione_pasto: "indifferente", dettaglio_pasto: null, note: "Sciacquare bocca dopo",
    data_inizio: "2026-04-14", data_fine: "2026-04-18", attivo: 1, demo: 1 },

  { id: 11, nome: "Levotuss 10ml", principio_attivo: "levodropropizina", funzione: "Sedativo tosse",
    tipo_frequenza: "intervallo", intervallo_ore: 8.0, intervallo_minimo_ore: 4.0, dosi_giornaliere: 3,
    relazione_pasto: "indifferente", dettaglio_pasto: null, note: null,
    data_inizio: "2026-04-14", data_fine: "2026-04-16", attivo: 1, demo: 1 }
];

// --- Base schedules (spec 3.5) ---
// farmaco_id references FARMACI.id; offset is in minutes from anchor.
const ORARI_BASE = [
  { farmaco_id: 1,  dose_numero: 1, offset_minuti: -30, ancora_riferimento: "colazione", descrizione_momento: "prima di colazione" },
  { farmaco_id: 2,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "colazione", descrizione_momento: "colazione" },
  { farmaco_id: 3,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "colazione", descrizione_momento: "colazione" },
  { farmaco_id: 4,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "colazione", descrizione_momento: "colazione" },
  { farmaco_id: 4,  dose_numero: 2, offset_minuti: 0,   ancora_riferimento: "cena",      descrizione_momento: "cena" },
  { farmaco_id: 5,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "colazione", descrizione_momento: "colazione" },
  { farmaco_id: 6,  dose_numero: 1, offset_minuti: 150, ancora_riferimento: "colazione", descrizione_momento: "metà mattina" },
  { farmaco_id: 7,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "cena",      descrizione_momento: "cena" },
  { farmaco_id: 8,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "cena",      descrizione_momento: "cena" },
  { farmaco_id: 9,  dose_numero: 1, offset_minuti: 0,   ancora_riferimento: "colazione", descrizione_momento: "colazione" },
  { farmaco_id: 9,  dose_numero: 2, offset_minuti: 360, ancora_riferimento: "colazione", descrizione_momento: "pomeriggio" },
  { farmaco_id: 10, dose_numero: 1, offset_minuti: 30,  ancora_riferimento: "colazione", descrizione_momento: "dopo colazione" },
  { farmaco_id: 10, dose_numero: 2, offset_minuti: 510, ancora_riferimento: "colazione", descrizione_momento: "pomeriggio" },
  { farmaco_id: 10, dose_numero: 3, offset_minuti: 990, ancora_riferimento: "colazione", descrizione_momento: "notte" },
  { farmaco_id: 11, dose_numero: 1, offset_minuti: 30,  ancora_riferimento: "colazione", descrizione_momento: "dopo colazione" },
  { farmaco_id: 11, dose_numero: 2, offset_minuti: 510, ancora_riferimento: "colazione", descrizione_momento: "pomeriggio" },
  { farmaco_id: 11, dose_numero: 3, offset_minuti: 990, ancora_riferimento: "colazione", descrizione_momento: "notte" }
];

// ============================================================
// Seed runner — idempotent.
// Uses `impostazioni_app[seed_loaded] = 1` as the "already seeded"
// marker. Calling runSeedIfNeeded() multiple times is a no-op after
// the first run.
// ============================================================
export async function runSeedIfNeeded() {
  const marker = await db.impostazioni_app.get(SETTINGS_KEYS.SEED_LOADED);
  if (marker && marker.valore === 1) {
    return { seeded: false, reason: "already_seeded" };
  }

  // One transaction covering all five stores — atomic seed.
  await db.transaction(
    "rw",
    db.farmaci, db.orari_base, db.profilo_utente, db.impostazioni_app,
    async () => {
      await db.profilo_utente.bulkAdd(PROFILI);
      await db.farmaci.bulkAdd(FARMACI);
      await db.orari_base.bulkAdd(ORARI_BASE);
      await db.impostazioni_app.bulkPut([
        { chiave: SETTINGS_KEYS.NOME_UTENTE,    valore: "" },
        { chiave: SETTINGS_KEYS.SEED_LOADED,    valore: 1 },
        { chiave: SETTINGS_KEYS.SCHEMA_VERSION, valore: 1 }
      ]);
    }
  );

  return { seeded: true, profili: PROFILI.length, farmaci: FARMACI.length, orari: ORARI_BASE.length };
}

// ============================================================
// Demo data cleanup — wipes only records marked `demo: 1`.
// User-created records are preserved.
// Called from Config (Step 8).
// ============================================================
export async function clearDemoData() {
  await db.transaction(
    "rw",
    db.farmaci, db.orari_base, db.log_assunzioni, db.profilo_utente,
    async () => {
      // Find demo farmaci IDs first, then cascade into orari_base and log_assunzioni
      const demoFarmaci = await db.farmaci.where("demo").equals(1).toArray();
      const demoIds = demoFarmaci.map(f => f.id);

      if (demoIds.length > 0) {
        await db.orari_base.where("farmaco_id").anyOf(demoIds).delete();
        await db.log_assunzioni.where("farmaco_id").anyOf(demoIds).delete();
        await db.farmaci.where("demo").equals(1).delete();
      }

      await db.profilo_utente.where("demo").equals(1).delete();
    }
  );
}

// ============================================================
// Full database wipe — for debug / reset. Drops the entire DB.
// Caller must reload the page afterwards so Dexie re-opens with
// a fresh schema and re-runs the seed.
// ============================================================
export async function wipeDatabase() {
  await db.delete();
}
