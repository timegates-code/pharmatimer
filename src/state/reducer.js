// ============================================================
// Root reducer — pure, synchronous, no I/O.
// All async work (repo, domain calls) happens in thunks (actions.js).
// See Changelog Fase 2 §13 for the 16-action design.
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
      } = action.payload;
      return {
        ...state,
        status: 'ready',
        error: null,
        nomeUtente,
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
