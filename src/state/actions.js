// ============================================================
// Action creators — async thunks closing over {dispatch, getState, repo}.
// All domain work stays pure (recalc/planBuilder); thunks orchestrate
// I/O (repo) and state transitions (dispatch).
// See Changelog Fase 2 §11 (AMB-5b2, AMB-6) + §13 + §6.27 (AMB-7a.M).
// ============================================================

import {
  applyAssunzione,
  applySalto,
  applySospensione,
  applyRecupero,
  applyRipristino,
  applyAnnullaAssunzione,
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
import { selectToday, selectProfiloById } from './selectors.js';
import { commitApplyResult } from './applyHelper.js';

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------
// NOTE: `resolveNow` used to live here as a private helper.
// It was extracted to `src/utils/now.js` in Sessione 6 (AMB-6.A)
// so that the hook `useNow`, selectors and thunks share a single
// source of truth for "now" resolution.

/**
 * Convert an array of {chiave, valore} rows (as returned by repo.getAllSettings)
 * into a plain object keyed by `chiave`. Handles both shapes defensively:
 *   - Array<{chiave, valore}> → { chiave: valore, ... }
 *   - Plain object            → returned as-is
 *   - null / undefined        → {}
 */
function normaliseSettingsDict(raw) {
  if (raw == null) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const row of raw) {
      if (row && typeof row.chiave === 'string') {
        out[row.chiave] = row.valore;
      }
    }
    return out;
  }
  if (typeof raw === 'object') return { ...raw };
  return {};
}

/**
 * Derive an entry key from a log row's composite identity.
 *
 * The canonical formula lives in `src/domain/planBuilder.js` (see also
 * `src/domain/recalc.test.js:61` for the test-side assertion):
 *     key = `${dateStr}-${farmaco.id}-${orario.dose_numero}`
 *
 * Log rows use snake_case names (`farmaco_id`, `data`, `dose_numero`); the
 * same pair `(farmaco.id, orario.dose_numero)` is already threaded across
 * both worlds by `cambiaProfilo` when computing `logsToDelete`. Centralising
 * the translation here keeps the mapping in one obvious spot and makes the
 * eventual promotion to a shared `makeEntryKey(...)` helper a trivial move.
 */
function logRowToEntryKey(logRow) {
  return `${logRow.data}-${logRow.farmaco_id}-${logRow.dose_numero}`;
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
      const [profili, farmaci, orari, allSettings] = await Promise.all([
        repo.getProfili(),
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
        repo.getAllSettings(),
      ]);

      const impostazioni = normaliseSettingsDict(allSettings);

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
          impostazioni,
          profili,
          profiloAttivo,
          farmaci,
          orari,
          plan,
          lastBuiltForDay: today,
        },
      });

      // Sessione 8-pre (§6.72, supersedes §6.40): rehydrate presoStack
      // with the keys of every 'presa' log in the window
      // [today - PLAN_DAYS_BEFORE, ..., today]. Preserves UNDO direct
      // affordance across cross-day reloads — a press registered
      // yesterday must remain tappable today via UndoModal.
      //
      // Source optimization (§6.75): we reuse `logAssunzioni` already
      // fetched above for buildMultiDayPlan instead of issuing a
      // dedicated range query. `logAssunzioni` covers
      // [today - PLAN_DAYS_BEFORE, today + PLAN_DAYS_AFTER], a strict
      // superset of the presoStack window, so the in-memory filter
      // below is equivalent to a dedicated query and cheaper.
      //
      // Filter semantics:
      //   - stato === 'presa' (other states are irrelevant to UNDO)
      //   - data >= startPresoDate (left bound of the window)
      //   - data <= today (exclude any future-dated 'presa' entries
      //     that may theoretically live in logAssunzioni via
      //     PLAN_DAYS_AFTER; defensive guard)
      //
      // Sort order: repo.getLogByRange returns ASC by (data,
      // ora_effettiva). The filter preserves that order, so the LIFO
      // convention (top = stack.at(-1) = most recent press) holds.
      //
      // Dispatched AFTER INIT_SUCCESS (not merged into its payload) to
      // keep the init shape change minimal and isolate this concern
      // in its own action. No-op if the filter result is empty.
      const startPresoDate = addDays(today, -PLAN_DAYS_BEFORE);
      const presaLogsInWindow = logAssunzioni.filter(
        (l) => l.stato === 'presa' && l.data >= startPresoDate && l.data <= today
      );
      dispatch({
        type: 'SET_PRESO_STACK',
        payload: presaLogsInWindow.map(logRowToEntryKey),
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
      domainCall: (plan) => applyAnnullaAssunzione(plan, entryKey),
      popPresoKey: true,
    });
  }

  /**
   * Undo a specific assumption identified by entryKey (Sessione 7d-2 CP4,
   * Changelog Fase 2 §6.41 + §6.62). Unlike annullaUltima, this thunk does
   * NOT require the target to be on top of presoStack — the UndoModal can
   * trigger it from any Card currently in state 'presa'.
   *
   * On success dispatches REMOVE_PRESO_KEY to keep presoStack coherent.
   *
   * Guard DOWNSTREAM_USER_EDITS (§6.61): the pure domain function throws
   * DomainError when N+1 is 'presa' or 'sospesa'. commitApplyResult maps
   * DomainError to SET_ERROR with kind:'domain' preserving the code; UI
   * consumers read state.error.code to surface the banner.
   */
  async function annullaAssunzione(entryKey) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAnnullaAssunzione(plan, entryKey),
    });
    if (result.ok) {
      dispatch({ type: 'REMOVE_PRESO_KEY', payload: entryKey });
    }
    return result;
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

  /**
   * Optimistic generic setting update.
   *
   * Dispatch flow (post §6.77 cleanup): SET_IMPOSTAZIONE only — no
   * mirrored dispatch. `nome_utente` is treated exactly like any other
   * setting; consumers read via `selectImpostazione(state, 'nome_utente')`.
   *
   * On repo failure the optimistic SET_IMPOSTAZIONE is rolled back to
   * the previous value.
   */
  async function setSetting(chiave, valore) {
    const stateBefore = getState();
    const prevValore = stateBefore.impostazioni?.[chiave];

    // Optimistic dispatch — unique channel post §6.77.
    dispatch({ type: 'SET_IMPOSTAZIONE', payload: { chiave, valore } });

    try {
      await repo.setSetting(chiave, valore);
      return { ok: true };
    } catch (err) {
      // Rollback optimistic write. When the key didn't exist before we
      // still dispatch with `valore: prevValore (undefined)`; the reducer
      // spread-merge puts that key at `undefined`, which is fine — the
      // missing-key semantic is already handled by `selectImpostazione`
      // returning null for undefined.
      dispatch({
        type: 'SET_IMPOSTAZIONE',
        payload: { chiave, valore: prevValore },
      });
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


  // ----------------------------------------------------------
  // Profili CRUD thunks (AMB-8b.D / §11)
  // ----------------------------------------------------------
  //
  // Pessimistic pattern: await repo.* before dispatching the state
  // mutation. Ensures state.profili never reflects a write that did
  // not land in IndexedDB. Divergence from setSetting (optimistic) is
  // intentional — profili CRUD is low-frequency and correctness beats
  // perceived latency here.
  //
  // AMB-8b.E guard in updateProfilo: the `attivo` field is stripped
  // from the patch before repo.update. Activation flows exclusively
  // through cambiaProfilo / APPLY_CAMBIO_PROFILO (see attivaProfilo
  // wrapper in CP5). This closes the vulnerability where a buggy form
  // could toggle `attivo` via the generic update channel bypassing
  // the cleanup logic in setProfiloAttivoConCleanup (§6.20).

  async function addProfilo(data) {
    try {
      const toInsert = { ...data, attivo: 0 };
      const id = await repo.addProfilo(toInsert);
      const state = getState();
      const profiliAggiornati = [...state.profili, { ...toInsert, id }];
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });
      return { ok: true, id };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nel salvataggio profilo',
        },
      });
      return { ok: false };
    }
  }

  async function updateProfilo(id, patch) {
    // AMB-8b.E: strip `attivo` from patch. Destructuring with rest
    // handles both "attivo present" and "attivo absent" cleanly.
    const { attivo: _drop, ...safePatch } = patch;
    try {
      await repo.updateProfilo(id, safePatch);
      const state = getState();
      const profiliAggiornati = state.profili.map((p) =>
        p.id === id ? { ...p, ...safePatch } : p
      );
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });

      // Mirror active-profile field + rebuild plan if the edited
      // profilo is the currently active one (§6.64 reactive rebuild).
      if (state.profiloAttivo && id === state.profiloAttivo.id) {
        dispatch({
          type: 'SET_PROFILO_ATTIVO',
          payload: { ...state.profiloAttivo, ...safePatch },
        });
        await rebuildPlan();
      }

      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nell\'aggiornamento profilo',
        },
      });
      return { ok: false };
    }
  }

  async function deleteProfilo(id) {
    // AMB-8b.F: repo.deleteProfilo already raises the §6.5 guard Error
    // when the target is the active profilo. The thunk just catches and
    // routes to SET_ERROR — no duplicate guard here.
    try {
      await repo.deleteProfilo(id);
      const state = getState();
      const profiliAggiornati = state.profili.filter((p) => p.id !== id);
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nell\'eliminazione profilo',
        },
      });
      return { ok: false };
    }
  }

  // ----------------------------------------------------------
  // Farmaci CRUD thunks (Sessione 8c-2 CP5 / §11 v2.5.28)
  // ----------------------------------------------------------
  //
  // Pessimistic pattern: all repo writes complete inside a
  // `withTransaction('rw', ['farmaci','orari_base'], ...)` scope
  // before state mutations are dispatched. Post-commit we refetch
  // BOTH farmaci AND orari (§6.93 — extended rationale below),
  // then dispatch SET_FARMACI + SET_ORARI, then rebuildPlan().
  //
  // §6.93 rationale: rebuildPlan reads state.orari to build the
  // multi-day plan. After replaceOrariForFarmaco(...) state.orari
  // is stale; a SET_FARMACI-only refresh (as the §11 prompt wrote
  // literally) would produce a plan based on pre-edit timings.
  // Refetching via repo.getAllOrari() + SET_ORARI keeps the state
  // coherent at zero UX cost. The reducer already exposes SET_ORARI
  // (reducer.js:164, introduced 8a CP4 alongside SET_FARMACI).
  //
  // Soft-delete invariant (§6.67): deleteFarmaco sets attivo=0 at
  // repo level. With GET_FARMACI_SOLO_ATTIVI=true (post-8c CP1),
  // the refetched farmaci list no longer includes the target; the
  // subsequent rebuildPlan drops its doses from the plan. Orari
  // rows remain in IDB for Log Fase 3 consultation — their refetch
  // returns them, but planBuilder ignores orphaned orari whose
  // farmaco_id is not in state.farmaci.

  async function addFarmaco(farmacoData, orari) {
    try {
      let newId;
      await repo.withTransaction('rw', ['farmaci', 'orari_base'], async () => {
        newId = await repo.addFarmaco({ ...farmacoData, attivo: 1 });
        if (Array.isArray(orari) && orari.length > 0) {
          await repo.replaceOrariForFarmaco(newId, orari);
        }
      });
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlan();
      return { ok: true, id: newId };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nel salvataggio farmaco',
        },
      });
      return { ok: false };
    }
  }

  async function updateFarmaco(id, patch, orari) {
    try {
      await repo.withTransaction('rw', ['farmaci', 'orari_base'], async () => {
        await repo.updateFarmaco(id, patch);
        if (Array.isArray(orari)) {
          // Accept empty array (wipe all orari) for contract completeness;
          // the form UX prevents this but the repo supports it.
          await repo.replaceOrariForFarmaco(id, orari);
        }
      });
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlan();
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nell\'aggiornamento farmaco',
        },
      });
      return { ok: false };
    }
  }

  async function deleteFarmaco(id) {
    // Soft-delete (§6.67): repo sets attivo=0, log rows untouched.
    // No explicit transaction — single write, atomic at the row level.
    try {
      await repo.deleteFarmaco(id);
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlan();
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          message: err?.message ?? 'Errore nell\'eliminazione farmaco',
        },
      });
      return { ok: false };
    }
  }

  // AMB-8b.D / F3: thin wrapper that resolves id -> profilo via
  // selectProfiloById and delegates to cambiaProfilo(profilo).
  // Exists because cambiaProfilo accepts a whole profilo object
  // (scoperta operativa §22.7 #4), and the UI layer naturally has
  // the id from the drawer context — so centralising the resolution
  // here avoids pushing selector knowledge to consumers.
  //
  // Return contract: {ok: true} on success, {ok: false} on unresolved
  // id. cambiaProfilo itself has no explicit return; the wrapper adds
  // one for uniformity with add/update/delete thunks (callers can rely
  // on `if (result?.ok)` across all profili CRUD thunks).
  async function attivaProfilo(id) {
    const profilo = selectProfiloById(getState(), id);
    if (profilo == null) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'domain',
          message: 'Profilo non trovato',
        },
      });
      return { ok: false };
    }
    await cambiaProfilo(profilo);
    return { ok: true };
  }

  return {
    init,
    rebuildPlan,
    addProfilo,
    updateProfilo,
    deleteProfilo,
    attivaProfilo,
    addFarmaco,
    updateFarmaco,
    deleteFarmaco,
    presa,
    salta,
    sospendi,
    recupero,
    ripristina,
    annullaUltima,
    annullaAssunzione,
    cambiaProfilo,
    dismissPrompt,
    setSetting,
    setSimulatedNow,
  };
}
