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
// CP4 par.6.172/175: opt-in seed loader for completeOnboarding('demo').
import { runSeedIfNeeded } from '../data/seed.js';
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
import { rescheduleAllNotifications } from '../services/notifications.js';

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
 * Default no-op services bag — used when callers (e.g. legacy tests)
 * invoke `createActions` without the `services` parameter. The shape
 * mirrors the production singleton from `services/notifications.js`
 * but every method is a no-op. §6.126 (Sessione 9-B parte 2/2).
 */
function defaultNoopServices() {
  return {
    notifications: {
      isSupported: () => false,
      getPermission: () => 'default',
      requestPermission: () => Promise.resolve('default'),
      scheduleNotification: () => {},
      cancelNotification: () => {},
      cancelAll: () => {},
      showDoseNotification: () => {},
      getPendingCount: () => 0,
    },
  };
}

/**
 * Build the action bag bound to the provider's dispatch/getState/repo/services.
 * @param {{
 *   dispatch: (a: {type: string, payload?: any}) => void,
 *   getState: () => import('./reducer.js').AppState,
 *   repo: any,
 *   services?: { notifications: any },
 * }} deps
 */
export function createActions({ dispatch, getState, repo, services = defaultNoopServices() }) {

  // §6.126 — Centralised reschedule helper. Called from every thunk
  // that mutates plan-relevant state (apply* dose actions, cambioProfilo,
  // 7 thunks Config, setSetting toggle on). Gates on:
  //   - state.status === 'ready' (otherwise plan/farmaci may be empty)
  //   - state.impostazioni.notifiche_attive === 1 (master switch)
  // AMB-9.E' (sincrona idempotente cancel-then-rebuild atomico): the
  // helper executes synchronously inside the calling microtask, so
  // back-to-back calls from rapid dispatches are safe.
  function maybeReschedule(state) {
    if (!state || state.status !== 'ready') return;
    if (state.impostazioni?.notifiche_attive !== 1) return;
    rescheduleAllNotifications(state, services.notifications);
  }


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

      // §6.126 — Trigger 1 (init): reschedule notifications after a
      // successful boot. No-op if notifiche_attive !== 1.
      maybeReschedule(getState());
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
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel ricalcolo del piano',
        },
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
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAssunzione(plan, input),
      pushPresoKey: entryKey,
    });
    maybeReschedule(getState()); // §6.126 trigger 2.1
    return result;
  }

  async function salta(entryKey, override = undefined) {
    // override reserved for API symmetry; applySalto does not consume it today.
    void override;
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySalto(plan, entryKey),
    });
    maybeReschedule(getState()); // §6.126 trigger 2.2
    return result;
  }

  async function sospendi(entryKey) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySospensione(plan, entryKey),
    });
    maybeReschedule(getState()); // §6.126 trigger 2.3
    return result;
  }

  async function recupero(entryKey, minuti) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRecupero(plan, entryKey, minuti),
    });
    maybeReschedule(getState()); // §6.126 trigger 2.4
    return result;
  }

  async function ripristina(entryKey, to) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRipristino(plan, entryKey, to),
    });
    maybeReschedule(getState()); // §6.126 trigger 2.5
    return result;
  }

  async function annullaUltima() {
    const stack = getState().presoStack;
    if (stack.length === 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'domain',
          severity: 'error',
          code: undefined,
          message: 'Nessuna azione da annullare',
        },
      });
      return { ok: false };
    }
    const entryKey = stack[stack.length - 1];
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAnnullaAssunzione(plan, entryKey),
      popPresoKey: true,
    });
    maybeReschedule(getState()); // §6.126 trigger 2.6
    return result;
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
    maybeReschedule(getState()); // §6.126 trigger 2.7
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
      maybeReschedule(getState()); // §6.126 trigger 4 (cambioProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel cambio profilo',
        },
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

      // §6.126 — Wave B notifications toggle dispatch.
      // chiave === 'notifiche_attive' is the dedicated path (AMB-9.G'):
      //   - valore === 1 → schedule all dose notifications now (trigger 6)
      //   - valore === 0 → cancel all pending timers (trigger 7)
      // Other settings (tema, nome_utente, ...) MUST NOT trigger reschedule
      // — that scope was explicitly excluded from AMB-9.G'.
      //
      // §6.132 (CP4 hotfix Sessione 9-B parte 2/2): bypass
      // maybeReschedule's gate. The optimistic dispatch above queued
      // notifiche_attive=valore, but stateRef will not reflect that
      // until React commits + the stateRef-tracking useEffect runs
      // (one tick later). maybeReschedule reads stateRef.current and
      // would see the pre-toggle value, failing its gate. We know the
      // new value here from `valore`, so call reschedule directly.
      // plan + farmaci are unchanged by the SET_IMPOSTAZIONE dispatch,
      // so reading them via stateRef is safe even when stale.
      // status==='ready' guard kept inline as defensive measure
      // (the UI already gates setSetting on ready state).
      if (chiave === 'notifiche_attive') {
        if (valore === 1) {
          const stateNow = getState();
          if (stateNow.status === 'ready') {
            rescheduleAllNotifications(stateNow, services.notifications);
          }
        } else {
          services.notifications.cancelAll();
        }
      }
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
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel salvataggio impostazione',
        },
      });
      return { ok: false };
    }
  }

  function setSimulatedNow(hhmm) {
    dispatch({ type: 'SET_SIMULATED_NOW', payload: hhmm });
  }

  // ----------------------------------------------------------
  // Toast (CP5 v3.0.0 Step 1, §6.176-177)
  // ----------------------------------------------------------
  //
  // Synchronous dispatchers — no I/O. `key` is Date.now() so the
  // <Toast /> consumer can `useEffect([state.toast?.key])` to re-arm
  // the auto-dismiss timer when the same message is fired twice in
  // succession (key changes even when message is identical).
  //
  // §6.177: the trigger for Mit-C (post-aggiunta farmaco) lives in
  // FarmaciTab.commitSave caller-side, NOT in addFarmaco thunk. This
  // avoids contaminating the thunk with profiloAttivo dependency for
  // computeOraPrevista, and ensures the seed flow (runSeedIfNeeded
  // bypasses addFarmaco via direct bulkPut) does not trigger spurious
  // toasts on the 3 demo farmaci.

  function showToast(message) {
    dispatch({
      type: 'SHOW_TOAST',
      payload: { key: Date.now(), message },
    });
  }

  function dismissToast() {
    dispatch({ type: 'DISMISS_TOAST' });
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
      maybeReschedule(getState()); // §6.126 trigger 5.1 (addProfilo)
      return { ok: true, id };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
      //
      // §6.102 (CP6 Sessione 8d-A-continue, §6.95 preventive retrofit,
      // AMB-8d.D proactive coherence defence): feed the fresh profilo
      // directly to rebuildPlanFromFresh to bypass stateRef lag.
      // AppContext updates stateRef in a useEffect that runs one tick
      // AFTER the dispatch below; invoking the no-arg `rebuildPlan()`
      // here would read `state.profiloAttivo` stale (pre-edit
      // ora_colazione/pranzo/cena), producing a plan with outdated
      // timings until the next app reload. The same coherence issue
      // was fixed reactively for the farmaci thunks in 8c-2 CP6
      // (§6.95 hotfix); here it is applied proactively.
      //
      // Prompt §11 referenced "APPLY_CAMBIO_PROFILO" imprecisely —
      // the dispatch below is SET_PROFILO_ATTIVO (APPLY_CAMBIO_PROFILO
      // lives in `cambiaProfilo`, a separate flow with its own plan
      // path via `ricalcolaPianoDaProfilo`).
      if (state.profiloAttivo && id === state.profiloAttivo.id) {
        const nuovoProfiloAttivo = { ...state.profiloAttivo, ...safePatch };
        dispatch({
          type: 'SET_PROFILO_ATTIVO',
          payload: nuovoProfiloAttivo,
        });
        await rebuildPlanFromFresh({ profilo: nuovoProfiloAttivo });
      }

      maybeReschedule(getState()); // §6.126 trigger 5.2 (updateProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
      maybeReschedule(getState()); // §6.126 trigger 5.3 (deleteProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
  // then dispatch SET_FARMACI + SET_ORARI, then rebuild the plan
  // via `rebuildPlanFromFresh` (§6.95 — stateRef-bypass below).
  //
  // §6.93 rationale: rebuildPlan reads state.orari to build the
  // multi-day plan. After replaceOrariForFarmaco(...) state.orari
  // is stale; a SET_FARMACI-only refresh (as the §11 prompt wrote
  // literally) would produce a plan based on pre-edit timings.
  // Refetching via repo.getAllOrari() + SET_ORARI keeps the state
  // coherent at zero UX cost. The reducer already exposes SET_ORARI
  // (reducer.js:164, introduced 8a CP4 alongside SET_FARMACI).
  //
  // §6.95 rationale (hotfix CP6 8c-2, scoperta durante browser step 4):
  // calling `await rebuildPlan()` right after SET_FARMACI/SET_ORARI
  // reads `stateRef.current`, which AppContext updates in a
  // `useEffect([state])` that runs one tick AFTER the dispatch.
  // Within the same microtask chain the thunk sees a state snapshot
  // that still excludes the freshly-written farmaco/orari — result:
  // the new med has zero entries in the plan. The fix keeps the
  // freshly-fetched `farmaci` + `orariAll` in local scope and feeds
  // them directly to `buildMultiDayPlan`, bypassing stateRef. Note:
  // `updateProfilo` (see above) has the same pattern but its active
  // profilo is spread into the dispatch payload so the observable
  // effect differs — retrofit candidate for 8d.
  //
  // Soft-delete invariant (§6.67): deleteFarmaco sets attivo=0 at
  // repo level. With GET_FARMACI_SOLO_ATTIVI=true (post-8c CP1),
  // the refetched farmaci list no longer includes the target; the
  // subsequent rebuild drops its doses from the plan. Orari rows
  // remain in IDB for Log Fase 3 consultation — their refetch
  // returns them, but planBuilder ignores orphaned orari whose
  // farmaco_id is not in farmaci.

  // §6.102 (CP6 Sessione 8d-A-continue): signature generalized from
  // `{farmaci, orari}` (both required) to `{profilo?, farmaci?, orari?}`
  // (all optional, stateRef fallback) to enable proactive coherence
  // defence for updateProfilo (§6.95 pattern, AMB-8d.D). Retrocompat
  // for the farmaci thunks (addFarmaco/updateFarmaco/deleteFarmaco):
  // they keep passing `{farmaci, orari}`, and `profilo` now reads from
  // stateRef via the fallback — this is correct because those thunks
  // do not mutate the profilo.
  async function rebuildPlanFromFresh({ profilo, farmaci, orari } = {}) {
    const state = getState();
    const targetProfilo = profilo ?? state.profiloAttivo;
    if (!targetProfilo) return;
    const targetFarmaci = farmaci ?? state.farmaci;
    const targetOrari = orari ?? state.orari;
    const today = selectToday(state);
    const startDate = addDays(today, -PLAN_DAYS_BEFORE);
    const endDate = addDays(today, PLAN_DAYS_AFTER);
    const logAssunzioni = await repo.getLogByRange(startDate, endDate);
    const plan = buildMultiDayPlan({
      profilo: targetProfilo,
      farmaci: targetFarmaci,
      orari: targetOrari,
      logAssunzioni,
      startDate,
      numDays: PLAN_TOTAL_DAYS,
    });
    dispatch({
      type: 'REBUILD_PLAN',
      payload: { plan, lastBuiltForDay: today },
    });
  }

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
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.4 (addFarmaco)
      return { ok: true, id: newId };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.5 (updateFarmaco)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.6 (deleteFarmaco)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
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
          severity: 'error',
          code: undefined,
          message: 'Profilo non trovato',
        },
      });
      return { ok: false };
    }
    await cambiaProfilo(profilo);
    // §6.126 trigger 5.7 (attivaProfilo) — Q2=A: explicit reschedule
    // here in addition to cambiaProfilo's own (trigger 4). The double
    // call on the wrapper path is accepted by AMB-9.E' (sincrona
    // idempotente cancel-then-rebuild atomico): two consecutive sync
    // executions cannot leak timers (JS single-threaded; cancelAll
    // empties the Map before each rebuild loop).
    maybeReschedule(getState());
    return { ok: true };
  }

  // §6.142 — scheduleTestDose: smoke test thunk per validazione runtime
  // del flusso notifications (CP browser §11 P1-P5+P8 Sessione 9-B parte 5/5).
  // Crea entry sintetica con ora_prevista = now + minutesFromNow nel wall
  // clock reale, bypassando il limite §6.141 (simulatedNow non propaga ai
  // setTimeout). Bypassa intenzionalmente il gate maybeReschedule
  // (notifiche_attive=1 non è prerequisito): il chiamante controlla il
  // toggle quando invoca via Console (`__pt.app.actions.scheduleTestDose(5)`).
  // Shape entry post-§6.138: orario.{farmaco_id, dose_numero} nested.
  // dose_numero=999 sentinel garantisce entryKey stabile per (farmaco, day),
  // quindi 2× invocazioni con stesso farmacoId collassano via tag-as-Map-key
  // del singleton notifications (validazione P8).
  async function scheduleTestDose(minutesFromNow = 5, opts = {}) {
    const state = getState();
    if (state.status !== 'ready') {
      throw new Error('NOT_READY');
    }
    const farmaci = state.farmaci;
    if (!farmaci || farmaci.length === 0) {
      throw new Error('NO_FARMACI');
    }
    const farmaco = opts.farmacoId
      ? farmaci.find((f) => f.id === opts.farmacoId)
      : farmaci[0];
    if (!farmaco) {
      throw new Error('FARMACO_NOT_FOUND');
    }

    const today = selectToday(state);
    const fireAtMs = Date.now() + minutesFromNow * 60_000;
    const fireDate = new Date(fireAtMs);
    const hh = String(fireDate.getHours()).padStart(2, '0');
    const mm = String(fireDate.getMinutes()).padStart(2, '0');
    const ora_prevista = `${hh}:${mm}`;

    const syntheticEntry = {
      dateStr: today,
      orario: { farmaco_id: farmaco.id, dose_numero: 999, offset_minuti: 0 },
      farmaco,
      ora_prevista,
      ora_ricalcolata: null,
      stato: 'prevista',
    };

    // §6.145: build fresh state explicitly. Re-reading via getState()
    // here yields STALE state because dispatch updates stateRef in a
    // useEffect one tick later (pattern §6.95/§6.102 from updateProfilo).
    // The synthetic entry would be invisible to the rescheduler otherwise.
    const newPlan = [...state.plan, syntheticEntry];
    dispatch({ type: 'SET_PLAN', payload: newPlan });
    const freshState = { ...state, plan: newPlan };
    rescheduleAllNotifications(freshState, services.notifications);
    return { ok: true, ora_prevista, farmacoId: farmaco.id };
  }

  /**
   * §6.168 (CP2 v3.0.0 Step 1) — Onboarding completion thunk.
   *
   * Captures `nome_utente` (if non-empty after trim) and flips the
   * `onboarding_completed` gating flag. Reuses the local `setSetting`
   * thunk for IDB persistence + optimistic dispatch + rollback on
   * repo failure (no duplicate I/O logic).
   *
   * `mode='demo'` is a no-op in CP2: the demo seed is allocated to
   * CP4 (par.6.168 carry-over). The mode argument is validated and
   * stored in scope but does not trigger any side-effect here.
   *
   * @param {string} nome    User-typed name (will be trimmed; empty
   *                         skips the nome_utente write).
   * @param {'empty'|'demo'} mode  Onboarding outcome.
   * @returns {Promise<{ok: true} | {ok: false}>}
   */
  async function completeOnboarding(nome, mode) {
    if (mode !== 'empty' && mode !== 'demo') {
      throw new Error(`completeOnboarding: invalid mode "${mode}"`);
    }

    const trimmed = (nome ?? '').trim();
    if (trimmed.length > 0) {
      const r = await setSetting('nome_utente', trimmed);
      if (!r?.ok) return r;
    }

    const r2 = await setSetting('onboarding_completed', 1);
    if (!r2?.ok) return r2;

    // par.6.168 closure (CP4 par.6.175): demo seed via opt-in.
    if (mode === 'demo') {
      try {
        await runSeedIfNeeded({ force: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('completeOnboarding: seed demo failed', err);
        // Non blocking: onboarding_completed gia settato, app procede.
      }
    }

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
    completeOnboarding,
    setSimulatedNow,
    scheduleTestDose,
    // CP5 v3.0.0 Step 1 (§6.176-177) — Toast Mit-C dispatchers.
    showToast,
    dismissToast,
  };
}
