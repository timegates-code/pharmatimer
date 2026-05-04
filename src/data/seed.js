import { db, SETTINGS_KEYS } from "./db.js";

// =============================================================
// Seed data — neutral demo data (CP4 v3.0.0 Step 1, par.6.172-175).
// =============================================================
//
// Replaces the legacy Roberto-personalized seed (11 farmaci + 2
// profili) with a neutral 3-farmaci demo (Q-UX.6 + par.22.43):
//
//   1. Esempio Gastro 40mg       (fisso, 1 dose, prima colazione)
//   2. Esempio Cardio 5mg        (fisso, 1 dose, durante cena)
//   3. Esempio Antibiotico 500mg (intervallo 8h, 3 dosi)
//
// All records carry `demo: 1` so the user can wipe them via
// `clearDemoData` from Config (Step 8 legacy + CP6 reset).
//
// par.6.172 (CP4): seed is no longer auto-bootstrapped at app
// boot. The call from main.jsx has been removed; runSeedIfNeeded
// is invoked only from the `completeOnboarding` thunk when the
// user picks mode='demo' in the onboarding flow.
//
// par.6.173: only one neutral profile "Standard" (was 2 in legacy).
//
// par.6.174: data_inizio is computed dynamically as "tomorrow" at
// seed time — the user sees Mit-A preview (next-day doses)
// immediately after onboarding, and the seed never goes stale.
//
// par.6.175: signature is now runSeedIfNeeded({ force = false } = {}).
// `force=true` skips the seed_loaded marker check and uses bulkPut
// to be safe across re-runs (post-CP6 reset). Default `force=false`
// preserves the legacy idempotent behaviour for devCheck and tests.
// =============================================================

// --- Daily-rhythm profile (single neutral demo, par.6.173) ---
const PROFILI = [
  {
    nome_profilo: "Standard",
    ora_sveglia: "07:00",
    ora_colazione: "07:30",
    ora_pranzo: "13:00",
    ora_cena: "20:30",
    ora_sonno: "23:30",
    attivo: 1,
    demo: 1,
  },
];

// --- Compute tomorrow YYYY-MM-DD at seed time (par.6.174) ---
function tomorrowDateStr() {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
}

// --- Medications (Q-UX.6 + par.22.43 letterale) ---
// Exported for unit testing of demo data structure.
export function buildFarmaciDemo(dataInizio) {
  return [
    {
      id: 1,
      nome: "Esempio Gastro 40mg",
      principio_attivo: "esempio",
      funzione: "Gastroprotettore (esempio)",
      tipo_frequenza: "fisso",
      intervallo_ore: null,
      intervallo_minimo_ore: null,
      dosi_giornaliere: 1,
      relazione_pasto: "prima",
      dettaglio_pasto: "30 min prima colazione",
      note: "Farmaco di esempio (rimuovibile)",
      data_inizio: dataInizio,
      data_fine: null,
      attivo: 1,
      demo: 1,
    },
    {
      id: 2,
      nome: "Esempio Cardio 5mg",
      principio_attivo: "esempio",
      funzione: "Cardiovascolare (esempio)",
      tipo_frequenza: "fisso",
      intervallo_ore: null,
      intervallo_minimo_ore: null,
      dosi_giornaliere: 1,
      relazione_pasto: "durante",
      dettaglio_pasto: "durante cena",
      note: "Farmaco di esempio (rimuovibile)",
      data_inizio: dataInizio,
      data_fine: null,
      attivo: 1,
      demo: 1,
    },
    {
      id: 3,
      nome: "Esempio Antibiotico 500mg",
      principio_attivo: "esempio",
      funzione: "Antibatterico (esempio)",
      tipo_frequenza: "intervallo",
      intervallo_ore: 8.0,
      intervallo_minimo_ore: 4.0,
      dosi_giornaliere: 3,
      relazione_pasto: "indifferente",
      dettaglio_pasto: null,
      note: "Farmaco di esempio (rimuovibile)",
      data_inizio: dataInizio,
      data_fine: null,
      attivo: 1,
      demo: 1,
    },
  ];
}

// --- Base schedules (spec 3.5) ---
const ORARI_BASE = [
  // Gastro: 30 min prima colazione
  {
    farmaco_id: 1,
    dose_numero: 1,
    offset_minuti: -30,
    ancora_riferimento: "colazione",
    descrizione_momento: "prima di colazione",
  },
  // Cardio: durante cena
  {
    farmaco_id: 2,
    dose_numero: 1,
    offset_minuti: 0,
    ancora_riferimento: "cena",
    descrizione_momento: "cena",
  },
  // Antibiotico: 30min dopo colazione + 8h + 8h
  {
    farmaco_id: 3,
    dose_numero: 1,
    offset_minuti: 30,
    ancora_riferimento: "colazione",
    descrizione_momento: "dopo colazione",
  },
  {
    farmaco_id: 3,
    dose_numero: 2,
    offset_minuti: 510,
    ancora_riferimento: "colazione",
    descrizione_momento: "pomeriggio",
  },
  {
    farmaco_id: 3,
    dose_numero: 3,
    offset_minuti: 990,
    ancora_riferimento: "colazione",
    descrizione_momento: "notte",
  },
];

// =============================================================
// Seed runner — opt-in (par.6.172 / par.6.175).
// =============================================================
//
// Default behaviour (no args): legacy idempotent — uses the
// `seed_loaded` marker, no-op after first invocation. Used by
// devCheck and ImpostazioniTab tests.
//
// `{ force: true }`: invoked from completeOnboarding('demo')
// thunk. Skips marker check, uses bulkPut so re-runs (post-CP6
// reset scenarios) are safe.
//
// Note: `nome_utente` is NOT seeded here (CP4). The onboarding
// flow sets it via `completeOnboarding` thunk before calling the
// seed, so any default would overwrite a real value (ordering bug).
// =============================================================
export async function runSeedIfNeeded({ force = false } = {}) {
  if (!force) {
    const marker = await db.impostazioni_app.get(SETTINGS_KEYS.SEED_LOADED);
    if (marker && marker.valore === 1) {
      return { seeded: false, reason: "already_seeded" };
    }
  }

  const dataInizio = tomorrowDateStr();
  const FARMACI = buildFarmaciDemo(dataInizio);

  await db.transaction(
    "rw",
    db.farmaci, db.orari_base, db.profilo_utente, db.impostazioni_app,
    async () => {
      await db.profilo_utente.bulkPut(PROFILI);
      await db.farmaci.bulkPut(FARMACI);
      await db.orari_base.bulkPut(ORARI_BASE);
      await db.impostazioni_app.bulkPut([
        { chiave: SETTINGS_KEYS.SEED_LOADED, valore: 1 },
        { chiave: SETTINGS_KEYS.SCHEMA_VERSION, valore: 1 },
        // par.6.129: default OFF for Wave B notifications.
        { chiave: SETTINGS_KEYS.NOTIFICHE_ATTIVE, valore: 0 },
      ]);
    }
  );

  return {
    seeded: true,
    profili: PROFILI.length,
    farmaci: FARMACI.length,
    orari: ORARI_BASE.length,
  };
}

// =============================================================
// Demo data cleanup — wipes only records marked `demo: 1`.
// User-created records are preserved. Called from Config (Step 8)
// and reachable via CP6 reset (par.22.43).
// =============================================================
export async function clearDemoData() {
  await db.transaction(
    "rw",
    db.farmaci, db.orari_base, db.log_assunzioni, db.profilo_utente,
    async () => {
      const demoFarmaci = await db.farmaci.where("demo").equals(1).toArray();
      const demoIds = demoFarmaci.map((f) => f.id);

      if (demoIds.length > 0) {
        await db.orari_base.where("farmaco_id").anyOf(demoIds).delete();
        await db.log_assunzioni.where("farmaco_id").anyOf(demoIds).delete();
        await db.farmaci.where("demo").equals(1).delete();
      }

      await db.profilo_utente.where("demo").equals(1).delete();
    }
  );
}

// =============================================================
// Full database wipe — for debug / reset (CP6 reachable).
// =============================================================
export async function wipeDatabase() {
  await db.delete();
}
