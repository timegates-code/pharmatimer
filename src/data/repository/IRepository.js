// ============================================================
// Repository interface — JSDoc-only contract.
// ============================================================
// Purpose: define the single data-access contract that the rest
// of the app depends on. Concrete implementations:
//   - LocalRepository (IndexedDB via Dexie)   — implemented now
//   - ApiRepository   (FastAPI + MariaDB)     — future (Fase backend)
//
// When the backend arrives, only the factory in `index.js`
// swaps; consumers (reducer, planBuilder, UI) stay unchanged.
// ============================================================

// --- Entity typedefs (mirror spec section 3) ----------------

/**
 * @typedef {Object} Profilo
 * @property {number} [id]
 * @property {string} nome_profilo
 * @property {string} ora_sveglia      HH:MM
 * @property {string} ora_colazione    HH:MM
 * @property {string} ora_pranzo       HH:MM
 * @property {string} ora_cena         HH:MM
 * @property {string} ora_sonno        HH:MM
 * @property {0|1}    attivo           Only one active profile at a time
 * @property {0|1}    [demo]
 */

/**
 * @typedef {Object} Farmaco
 * @property {number} [id]
 * @property {string} nome
 * @property {string} [principio_attivo]
 * @property {string} [funzione]
 * @property {"intervallo"|"fisso"} tipo_frequenza
 * @property {number|null} intervallo_ore
 * @property {number|null} intervallo_minimo_ore
 * @property {number} dosi_giornaliere
 * @property {"prima"|"durante"|"dopo"|"stomaco_pieno"|"lontano"|"indifferente"} relazione_pasto
 * @property {string|null} [dettaglio_pasto]
 * @property {string|null} [note]
 * @property {string} data_inizio      YYYY-MM-DD
 * @property {string|null} data_fine   YYYY-MM-DD or null (chronic)
 * @property {0|1} attivo
 * @property {0|1} [demo]
 */

/**
 * @typedef {Object} OrarioBase
 * @property {number} [id]
 * @property {number} farmaco_id
 * @property {number} dose_numero
 * @property {number} offset_minuti
 * @property {"sveglia"|"colazione"|"pranzo"|"cena"|"sonno"|"assoluto"} ancora_riferimento
 * @property {string} [descrizione_momento]
 */

/**
 * @typedef {Object} LogAssunzione
 * @property {number} [id]
 * @property {number} farmaco_id
 * @property {string} data                 YYYY-MM-DD
 * @property {number} dose_numero
 * @property {string} ora_prevista         HH:MM
 * @property {string|null} [ora_effettiva] HH:MM or null
 * @property {number|null} [delta_minuti]
 * @property {string|null} [ora_ricalcolata]
 * @property {number} gap_minuti
 * @property {number} recupero_minuti
 * @property {"prevista"|"presa"|"saltata"|"sospesa"|"ricalcolata"} stato
 * @property {string|null} [note]
 */

// --- Repository interface -----------------------------------

/**
 * @typedef {Object} IRepository
 *
 * // --- Profili ---
 * @property {() => Promise<Profilo[]>}                   getProfili
 * @property {() => Promise<Profilo|null>}                getProfiloAttivo
 * @property {(p: Profilo) => Promise<number>}            addProfilo
 * @property {(id: number, patch: Partial<Profilo>) => Promise<void>} updateProfilo
 * @property {(id: number) => Promise<void>}              deleteProfilo
 * @property {(id: number) => Promise<void>}              setProfiloAttivo
 * @property {(profiloId: number, logsToDelete: Array<{farmaco_id: number, data: string, dose_numero: number}>) => Promise<void>} setProfiloAttivoConCleanup
 *
 * // --- Farmaci ---
 * @property {(opts?: {soloAttivi?: boolean}) => Promise<Farmaco[]>} getFarmaci
 * @property {(id: number) => Promise<Farmaco|null>}      getFarmaco
 * @property {(f: Farmaco) => Promise<number>}            addFarmaco
 * @property {(id: number, patch: Partial<Farmaco>) => Promise<void>} updateFarmaco
 * @property {(id: number) => Promise<void>}              deleteFarmaco
 *
 * // --- Orari base ---
 * @property {(farmacoId: number) => Promise<OrarioBase[]>} getOrariByFarmaco
 * @property {() => Promise<OrarioBase[]>}                getAllOrari
 * @property {(o: OrarioBase) => Promise<number>}         addOrario
 * @property {(id: number, patch: Partial<OrarioBase>) => Promise<void>} updateOrario
 * @property {(id: number) => Promise<void>}              deleteOrario
 * @property {(farmacoId: number, orari: OrarioBase[]) => Promise<void>} replaceOrariForFarmaco
 *
 * // --- Log assunzioni ---
 * @property {(data: string) => Promise<LogAssunzione[]>} getLogByData
 * @property {(dataDa: string, dataA: string) => Promise<LogAssunzione[]>} getLogByRange
 * @property {(farmacoId: number, data: string) => Promise<LogAssunzione[]>} getLogByFarmacoData
 * @property {(data: string, stato: "prevista"|"presa"|"saltata"|"sospesa"|"ricalcolata") => Promise<LogAssunzione[]>} getLogByDataStato
 * @property {(l: LogAssunzione) => Promise<number>}      addLog
 * @property {(id: number, patch: Partial<LogAssunzione>) => Promise<void>} updateLog
 * @property {(id: number) => Promise<void>}              deleteLog
 * @property {(farmacoId: number, data: string, doseNumero: number, patch: Partial<LogAssunzione>) => Promise<LogAssunzione>} upsertLog
 * @property {(logs: LogAssunzione[]) => Promise<LogAssunzione[]>} upsertLogsBatch
 *
 * // --- Impostazioni (key/value) ---
 * @property {(chiave: string) => Promise<any>}           getSetting
 * @property {(chiave: string, valore: any) => Promise<void>} setSetting
 * @property {() => Promise<Record<string, any>>}         getAllSettings
 */

// This file exports nothing at runtime — it's a pure contract.
// The factory in `./index.js` returns an object matching IRepository.
export {};
