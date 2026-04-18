// ============================================================
// Action creators — async thunks closing over {dispatch, getState, repo}.
// All domain work stays pure (recalc/planBuilder); thunks orchestrate
// I/O (repo) and state transitions (dispatch).
// See Changelog Fase 2 §11 (AMB-5b2, AMB-6) + §13 for the design contract.
// ============================================================

import {
  applyAssunzione,
  applySalto,
  applySospensione,
  applyRecupero,
  applyRipristino,
  annullaAssunzione,
  ricalcolaPianoDaProfilo,
} from '../domain/recalc.js';
import { buildMultiDayPlan } from '../domain/planBuilder.js';
import { addDays } from '../utils/time.js';
import { resolveNow } from '../utils/now.js';
import {
  PLAN_DAYS_BEFORE,
  PLAN_DAYS_AFTER,
  PLAN_TOTAL_DAYS,
  GET_FARMACI_SOLO_ATTIVI,
} from '../domain/constants.js';
import { selectToday } from './selectors.js';
import { commitApplyResult } from './applyHelper.js';

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------
// NOTE: `resolveNow` used to live here as a private helper.
// It was extracted to `src/utils/now.js` in Sessione 6 (AMB-6.A)
// so that the hook `useNow`, selectors and thunks share a single
// source of truth for "now" resolution.

/**
 * Read the previous reducer-held value for a known setting key.
 * Returns null if the key is not mirrored in state (persist-only key).
 */
function readSettingFromState(state, chiave) {
  switch (chiave) {
    case 'nome_utente':
      return state.nomeUtente;
    default:
      return null;
  }
}

/**
 * Dispatch the reducer action matching a known setting key.
 * Returns true if the key is known (dispatch performed), false otherwise.
 */
function dispatchSettingUpdate(dispatch, chiave, valore) {
  switch (chiave) {
    case 'nome_utente':
      dispatch({ type: 'SET_NOME_UTENTE', payload: valore });
      return true;
    default:
      return false;
  }
}

// ------------------------------------------------------------
// Thunk factory
// ------------------------------------------------------------

/**
 * Build the action bag bound to the provider's dispatch/getState/repo.
 * @param {{
 *   dispatch: (a: {type: string, payload?: any}) => void,
 *   getState: () => import('./reducer.js').AppState,
 *   repo: any,
 * }} deps
 */
export function createActions({ dispatch, getState, repo }) {

  // ----------------------------------------------------------
  // init / rebuildPlan
  // ----------------------------------------------------------

  async function init() {
    dispatch({ type: 'INIT_START' });
    try {
      const [profili, farmaci, orari, nomeUtente] = await Promise.all([
        repo.getProfili(),
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
        repo.getSetting('nome_utente'),
      ]);

      const profiloAttivo = profili.find((p) => p.attivo);
      if (!profiloAttivo) {
        throw new Error('NO_ACTIVE_PROFILE');
      }

      const today = selectToday(getState());
      const startDate = addDays(today, -PLAN_DAYS_BEFORE);
      const endDate = addDays(today, PLAN_DAYS_AFTER);
      const logAssunzioni = await repo.getLogByRange(startDate, endDate);

      const plan = buildMultiDayPlan({
        profilo: profiloAttivo,
        farmaci,
        orari,
        logAssunzioni,
        startDate,
        numDays: PLAN_TOTAL_DAYS,
      });

      dispatch({
        type: 'INIT_SUCCESS',
        payload: {
          nomeUtente: nomeUtente ?? '',
          profili,
          profiloAttivo,
          farmaci,
          orari,
          plan,
          lastBuiltForDay: today,
        },
      });
    } catch (err) {
      const code =
        err?.message === 'NO_ACTIVE_PROFILE' ? 'NO_ACTIVE_PROFILE' : 'INIT_FAILED';
      const message =
        code === 'NO_ACTIVE_PROFILE'
          ? 'Nessun profilo attivo. Attivane uno per continuare.'
          : (err?.message ?? 'Errore di inizializzazione');
      dispatch({
        type: 'INIT_ERROR',
        payload: { code, message },
      });
    }
  }

  async function rebuildPlan() {
    const state = getState();
    if (!state.profiloAttivo) return;
    try {
      const today = selectToday(state);
      const startDate = addDays(today, -PLAN_DAYS_BEFORE);
      const endDate = addDays(today, PLAN_DAYS_AFTER);
      const logAssunzioni = await repo.getLogByRange(startDate, endDate);
      const plan = buildMultiDayPlan({
        profilo: state.profiloAttivo,
        farmaci: state.farmaci,
        orari: state.orari,
        logAssunzioni,
        startDate,
        numDays: PLAN_TOTAL_DAYS,
      });
      dispatch({
        type: 'REBUILD_PLAN',
        payload: { plan, lastBuiltForDay: today },
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: { kind: 'repo', message: err?.message ?? 'Errore nel ricalcolo del piano' },
      });
    }
  }

  // ----------------------------------------------------------
  // apply* thunks — optimistic via commitApplyResult
  // ----------------------------------------------------------

  async function presa(entryKey, override = undefined) {
    const { dateStr, hhmm } = resolveNow(getState());
    const input = {
      entryKey,
      dataEffettiva: override?.dataEffettiva ?? dateStr,
      oraEffettiva: override?.oraEffettiva ?? hhmm,
    };
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAssunzione(plan, input),
      pushPresoKey: entryKey,
    });
  }

  async function salta(entryKey, override = undefined) {
    // override reserved for API symmetry; applySalto does not consume it today.
    void override;
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySalto(plan, entryKey),
    });
  }

  async function sospendi(entryKey) {
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySospensione(plan, entryKey),
    });
  }

  async function recupero(entryKey, minuti) {
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRecupero(plan, entryKey, minuti),
    });
  }

  async function ripristina(entryKey, to) {
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRipristino(plan, entryKey, to),
    });
  }

  async function annullaUltima() {
    const stack = getState().presoStack;
    if (stack.length === 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: { kind: 'domain', message: 'Nessuna azione da annullare' },
      });
      return { ok: false };
    }
    const entryKey = stack[stack.length - 1];
    return commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => annullaAssunzione(plan, entryKey),
      popPresoKey: true,
    });
  }

  // ----------------------------------------------------------
  // cambiaProfilo — pessimistic (persist first, dispatch after)
  // ----------------------------------------------------------

  async function cambiaProfilo(profilo) {
    try {
      const currentPlan = getState().plan;
      // ricalcolaPianoDaProfilo in recalc.js returns a bare Plan (array).
      // AMB-5b2.B: accept both shapes for future-proofing.
      const out = ricalcolaPianoDaProfilo(currentPlan, profilo);
      const newPlan = Array.isArray(out) ? out : out?.plan;
      if (!Array.isArray(newPlan)) {
        throw new Error('ricalcolaPianoDaProfilo: invalid return shape');
      }

      const logsToDelete = currentPlan
        .filter((e) => e.stato === 'ricalcolata')
        .map((e) => ({
          farmaco_id: e.farmaco.id,
          data: e.dateStr,
          dose_numero: e.orario.dose_numero,
        }));

      await repo.setProfiloAttivoConCleanup(profilo.id, logsToDelete);

      const profiliAggiornati = getState().profili.map((p) => ({
        ...p,
        attivo: p.id === profilo.id ? 1 : 0,
      }));

      dispatch({
        type: 'APPLY_CAMBIO_PROFILO',
        payload: {
          profiloAttivo: { ...profilo, attivo: 1 },
          profili: profiliAggiornati,
          plan: newPlan,
          lastBuiltForDay: selectToday(getState()),
        },
      });
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: { kind: 'repo', message: err?.message ?? 'Errore nel cambio profilo' },
      });
      return { ok: false };
    }
  }

  // ----------------------------------------------------------
  // UI / settings
  // ----------------------------------------------------------

  function dismissPrompt() {
    dispatch({ type: 'DISMISS_PROMPT' });
  }

  async function setSetting(chiave, valore) {
    const state = getState();
    const prev = readSettingFromState(state, chiave);
    const isKnown = dispatchSettingUpdate(dispatch, chiave, valore);
    try {
      await repo.setSetting(chiave, valore);
      return { ok: true };
    } catch (err) {
      // Optimistic rollback only for reducer-mirrored keys.
      if (isKnown && prev !== null) {
        dispatchSettingUpdate(dispatch, chiave, prev);
      }
      dispatch({
        type: 'SET_ERROR',
        payload: { kind: 'repo', message: err?.message ?? 'Errore nel salvataggio impostazione' },
      });
      return { ok: false };
    }
  }

  function setSimulatedNow(hhmm) {
    dispatch({ type: 'SET_SIMULATED_NOW', payload: hhmm });
  }

  // ----------------------------------------------------------
  // Action bag
  // ----------------------------------------------------------

  return {
    init,
    rebuildPlan,
    presa,
    salta,
    sospendi,
    recupero,
    ripristina,
    annullaUltima,
    cambiaProfilo,
    dismissPrompt,
    setSetting,
    setSimulatedNow,
  };
}
