// ============================================================
// Root reducer — pure, synchronous, no I/O.
// All async work (repo, domain calls) happens in thunks (actions.js).
// See Changelog Fase 2 §13 for the 16-action design.
// Sessione 7a (AMB-7a.M / §6.27) adds:
//   - state.impostazioni: { [chiave]: valore } generic dict
//   - SET_IMPOSTAZIONE action (used by setSetting thunk + init payload)
// The legacy state.nomeUtente mirror is kept for backwards compatibility
// with existing reducer cases and selectors.
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
 * @property {string} nomeUtente
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
  nomeUtente: '',
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
        nomeUtente, profili, profiloAttivo,
        farmaci, orari, plan, lastBuiltForDay,
        impostazioni,
      } = action.payload;
      return {
        ...state,
        status: 'ready',
        error: null,
        nomeUtente,
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

    // --- Config edits (farmaci / orari / nome) --------------
    case 'SET_FARMACI':
      return { ...state, farmaci: action.payload };

    case 'SET_ORARI':
      return { ...state, orari: action.payload };

    case 'SET_NOME_UTENTE':
      return { ...state, nomeUtente: action.payload };

    // --- Generic settings (AMB-7a.M / §6.27) ----------------
    // Generic key/value update on state.impostazioni. Spread-merge keeps
    // unrelated keys intact. Callers that keep a mirrored field (e.g. the
    // legacy nomeUtente mirror of impostazioni.nome_utente) are responsible
    // for dispatching SET_NOME_UTENTE alongside SET_IMPOSTAZIONE.
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
