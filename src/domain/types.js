/**
 * Domain type definitions for PharmaTimer.
 * JSDoc-only file: no runtime exports.
 * Imported via `@type {import('./types.js').TypeName}` in consumer files.
 */

/**
 * @typedef {object} Farmaco
 * @property {number} id
 * @property {string} nome
 * @property {string} [principio_attivo]
 * @property {string} funzione
 * @property {'intervallo'|'fisso'} tipo_frequenza
 * @property {number|null} intervallo_ore           - Hours between doses (only if tipo_frequenza='intervallo').
 * @property {number|null} intervallo_minimo_ore    - Minimum safety interval when applying gap recovery.
 * @property {number} dosi_giornaliere
 * @property {'prima'|'durante'|'dopo'|'stomaco_pieno'|'lontano'|'indifferente'} relazione_pasto
 * @property {string|null} [dettaglio_pasto]
 * @property {string|null} [note]
 * @property {string} data_inizio                   - ISO date 'YYYY-MM-DD'.
 * @property {string|null} data_fine                - ISO date 'YYYY-MM-DD' or null (chronic therapy).
 * @property {0|1|boolean} attivo
 * @property {0|1|boolean} [demo]
 */

/**
 * @typedef {object} OrarioBase
 * @property {number} id
 * @property {number} farmaco_id
 * @property {number} dose_numero
 * @property {number} offset_minuti                 - Offset in minutes from anchor.
 * @property {'sveglia'|'colazione'|'pranzo'|'cena'|'sonno'|'assoluto'} ancora_riferimento
 * @property {string|null} [descrizione_momento]
 */

/**
 * @typedef {object} Profilo
 * @property {number} id
 * @property {string} nome_profilo
 * @property {string} ora_sveglia                   - 'HH:MM'.
 * @property {string} ora_colazione
 * @property {string} ora_pranzo
 * @property {string} ora_cena
 * @property {string} ora_sonno
 * @property {0|1|boolean} attivo
 * @property {0|1|boolean} [demo]
 */

/**
 * Log entry as persisted in `log_assunzioni`.
 * Spec v1.2 sez. 3.6 — female ENUM.
 * @typedef {object} LogAssunzione
 * @property {number} [id]
 * @property {number} farmaco_id
 * @property {string} data                          - ISO date 'YYYY-MM-DD'.
 * @property {number} dose_numero
 * @property {string} ora_prevista                  - 'HH:MM'.
 * @property {string|null} ora_effettiva            - ISO datetime 'YYYY-MM-DDTHH:MM:SS' or null.
 * @property {number|null} delta_minuti             - Positive = late, negative = early.
 * @property {string|null} ora_ricalcolata          - 'HH:MM' or null.
 * @property {number} gap_minuti                    - Accumulated gap not yet recovered.
 * @property {number} recupero_minuti               - Recovery minutes applied to this dose.
 * @property {'prevista'|'presa'|'saltata'|'sospesa'|'ricalcolata'} stato
 * @property {string|null} [note]
 */

/**
 * Derived view: one row per (date, farmaco, dose). Rebuilt on demand from DB.
 * Not persisted. Fields mirror the v5 mockup plus explicit stato values.
 *
 * @typedef {object} PlanEntry
 * @property {string} key                           - `${dateStr}-${farmaco_id}-${dose_numero}`.
 * @property {string} dateStr                       - 'YYYY-MM-DD'.
 * @property {Farmaco} farmaco
 * @property {OrarioBase} orario
 * @property {string} ora_prevista                  - 'HH:MM' computed from active profile + offset.
 * @property {string|null} ora_ricalcolata          - 'HH:MM' or null.
 * @property {string|null} ora_ricalcolata_originale - 'HH:MM' or null (pre-recovery snapshot).
 * @property {string|null} ora_effettiva            - ISO datetime or null.
 * @property {number|null} delta_minuti
 * @property {number} gap_minuti
 * @property {number} gap_originale
 * @property {number} recupero_minuti
 * @property {'prevista'|'presa'|'saltata'|'sospesa'|'ricalcolata'} stato
 * @property {boolean} dose_prec_saltata            - Warning flag on next dose when previous was skipped.
 */

/**
 * @typedef {PlanEntry[]} Plan
 */

/**
 * Context passed to domain functions: everything they need from the outside world.
 * Purity rule: domain functions never read `Date.now()`, DB, or globals directly.
 *
 * @typedef {object} PlanContext
 * @property {Profilo} profilo                      - Active profile.
 * @property {Farmaco[]} farmaci                    - All farmaci (active + inactive filtered upstream as needed).
 * @property {OrarioBase[]} orari                   - All orari_base rows.
 * @property {LogAssunzione[]} logAssunzioni        - All log rows relevant to the date range.
 * @property {string} startDate                     - 'YYYY-MM-DD', plan start.
 * @property {number} numDays                       - Number of days to build.
 */

/**
 * Input for applyAssunzione / applySaltataSetTime flows.
 * Both "tap PRESA" (now) and "l'ho presa alle..." (retroactive) go through this shape.
 *
 * @typedef {object} AssunzioneInput
 * @property {string} entryKey                      - Target PlanEntry.key.
 * @property {string} dataEffettiva                 - 'YYYY-MM-DD'.
 * @property {string} oraEffettiva                  - 'HH:MM'.
 */

/**
 * Auto-prompt signal raised by the domain when the UI should open the gap modal
 * on the next dose (gap exceeded SOGLIA_PROMPT_RECUPERO).
 *
 * @typedef {object} AutoPrompt
 * @property {'gap_recovery'} kind
 * @property {string} entryKey                      - PlanEntry.key where the prompt should open.
 */

/**
 * Return shape of every `apply*` function. Pure: returns a new plan + optional prompt + optional log writes.
 *
 * @typedef {object} ApplyResult
 * @property {Plan} plan                            - Updated plan.
 * @property {LogAssunzione[]} logWrites            - Log rows to upsert/insert (the caller persists them).
 * @property {AutoPrompt|null} prompt               - Optional UI prompt signal.
 */

export {};
