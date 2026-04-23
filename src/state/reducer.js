// ============================================================
// Root reducer — pure, synchronous, no I/O.
// All async work (repo, domain calls) happens in thunks (actions.js).
// See Changelog Fase 2 §13 for the 16-action design.
// Sessione 7a (AMB-7a.M / §6.27) adds:
//   - state.impostazioni: { [chiave]: valore } generic dict
//   - SET_IMPOSTAZIONE action (used by setSetting thunk + init payload)
// Sessione 8a CP4 (§6.77) removes the legacy `state.nomeUtente` mirror:
//   - Field gone from AppState + initialState.
//   - SET_NOME_UTENTE case removed. Dispatching it is a no-op (default).
//   - INIT_SUCCESS no longer carries a dedicated `nomeUtente`; the value
//     lives under `state.impostazioni.nome_utente` and is read via
//     `selectImpostazione(state, 'nome_utente')`.
// ============================================================

/**
 * @typedef {object} AppError
 * @property {'domain'|'repo'|'init'|'unknown'} kind
 * @property {string} message
 * @property {string} [code]    Optional SCREAMING_SNAKE from DomainError.
 */

/**
 * @typedef {object} AppState
 * @property {'idle'|'ready'|'error'} status
 * @property {Record<string, any>} impostazioni   Generic settings dict loaded on init.
 * @property {import('../domain/types.js').Profilo[]} profili
 * @property {import('../domain/types.js').Profilo|null} profiloAttivo
 * @property {import('../domain/types.js').Farmaco[]} farmaci
 * @property {import('../domain/types.js').OrarioBase[]} orari
 * @property {import('../domain/types.js').Plan} plan
 * @property {import('../domain/types.js').AutoPrompt|null} prompt
 * @property {string[]} presoStack            Entry keys of recent 'presa' actions, for UNDO.
 * @property {AppError|null} error
 * @property {string|null} simulatedNow       'HH:MM' in DEV, null in prod.
 * @property {string|null} lastBuiltForDay    'YYYY-MM-DD' — latest day the plan was built for.
 */

/** @type {AppState} */
export const initialState = {
  status: 'idle',
  impostazioni: {},
  profili: [],
  profiloAttivo: null,
  farmaci: [],
  orari: [],
  plan: [],
  prompt: null,
  presoStack: [],
  error: null,
  simulatedNow: null,
  lastBuiltForDay: null,
};

/**
 * Pure reducer.
 * @param {AppState} state
 * @param {{type: string, payload?: any}} action
 * @returns {AppState}
 */
export function reducer(state, action) {
  switch (action.type) {

    // --- Init flow ------------------------------------------
    case 'INIT_START':
      return { ...state, status: 'idle', error: null };

    case 'INIT_SUCCESS': {
      const {
        profili, profiloAttivo,
        farmaci, orari, plan, lastBuiltForDay,
        impostazioni,
      } = action.payload;
      return {
        ...state,
        status: 'ready',
        error: null,
        impostazioni: impostazioni ?? {},
        profili,
        profiloAttivo,
        farmaci,
        orari,
        plan,
        lastBuiltForDay,
      };
    }

    case 'INIT_ERROR':
      return {
        ...state,
        status: 'error',
        error: { kind: 'init', ...action.payload },
      };

    // --- Domain commits -------------------------------------
    // Seeded init path used by AppProvider dual-mode (Sessione 7d-2 CP2, Changelog Fase 2 §6.49 / AMB-7d-2.B).
    case 'INIT_FROM_SEED':
      return { ...state, ...action.payload };

    case 'COMMIT_APPLY_RESULT': {
      const { plan, prompt, pushPresoKey } = action.payload;
      const presoStack = pushPresoKey
        ? [...state.presoStack, pushPresoKey]
        : state.presoStack;
      return {
        ...state,
        plan,
        prompt: prompt ?? null,
        presoStack,
      };
    }

    case 'APPLY_CAMBIO_PROFILO': {
      const { profiloAttivo, profili, plan, lastBuiltForDay } = action.payload;
      // Cambio profilo invalidates UNDO window and any open prompt.
      return {
        ...state,
        profiloAttivo,
        profili,
        plan,
        lastBuiltForDay,
        prompt: null,
        presoStack: [],
      };
    }

    // --- Plan maintenance -----------------------------------
    case 'SET_PLAN':
      return { ...state, plan: action.payload };

    case 'REBUILD_PLAN': {
      const { plan, lastBuiltForDay } = action.payload;
      return { ...state, plan, lastBuiltForDay };
    }

    case 'DISMISS_PROMPT':
      return { ...state, prompt: null };

    // Rehydrate presoStack from today's 'presa' logs at init time (Sessione 7d-2 CP3, Changelog Fase 2 §6.40 / AMB-7d-2.C).
    // Payload: string[] — entry keys in ASC order by ora_effettiva.
    case 'SET_PRESO_STACK':
      return { ...state, presoStack: action.payload };

    case 'POP_PRESO_STACK':
      if (state.presoStack.length === 0) return state;
      return { ...state, presoStack: state.presoStack.slice(0, -1) };

    // Remove a specific key from presoStack (Sessione 7d-2 CP4, §6.62).
    // Used by the annullaAssunzione thunk to keep stack coherence when
    // an individual (non-top) presa is undone. No-op if the key is absent.
    case 'REMOVE_PRESO_KEY':
      return {
        ...state,
        presoStack: state.presoStack.filter((k) => k !== action.payload),
      };

    // --- Config edits (farmaci / orari) ---------------------
    // SET_NOME_UTENTE was removed in Sessione 8a CP4 (§6.77). The nome is
    // now exclusively a generic setting — read via `selectImpostazione` and
    // written via `SET_IMPOSTAZIONE` / `setSetting('nome_utente', …)`.
    case 'SET_FARMACI':
      return { ...state, farmaci: action.payload };

    case 'SET_ORARI':
      return { ...state, orari: action.payload };

    // --- Profili (AMB-8b.C / Sessione 8b / §11) -------------
    // Full-list replacement pattern (template: SET_FARMACI/SET_ORARI).
    // SET_PROFILI is dispatched by add/update/delete thunks with the
    // post-mutation array; the list shape is small (2-3 profili) so
    // the write amplification is negligible. SET_PROFILO_ATTIVO is a
    // single-field write used by updateProfilo when the patched profilo
    // is the currently active one (mirror sync). The canonical channel
    // for full-profile activation remains APPLY_CAMBIO_PROFILO (reused
    // by the attivaProfilo wrapper in CP5, not a new reducer case).
    case 'SET_PROFILI':
      return { ...state, profili: action.payload };

    case 'SET_PROFILO_ATTIVO':
      return { ...state, profiloAttivo: action.payload };

    // --- Generic settings (AMB-7a.M / §6.27) ----------------
    // Generic key/value update on state.impostazioni. Spread-merge keeps
    // unrelated keys intact. Post-§6.77 cleanup: no mirrored field to sync
    // — this action is the sole write channel for every setting including
    // `nome_utente`.
    case 'SET_IMPOSTAZIONE': {
      const { chiave, valore } = action.payload;
      return {
        ...state,
        impostazioni: { ...state.impostazioni, [chiave]: valore },
      };
    }

    // --- Error channel --------------------------------------
    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    // --- Dev time controls ----------------------------------
    case 'SET_SIMULATED_NOW':
      return { ...state, simulatedNow: action.payload };

    case 'SET_LAST_BUILT_FOR_DAY':
      return { ...state, lastBuiltForDay: action.payload };

    // --- Unknown: no-op -------------------------------------
    default:
      return state;
  }
}
