import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { initialState, reducer } from './reducer.js';
import { selectToday } from './selectors.js';
import { createActions } from './actions.js';
import { repo } from '../data/repository/index.js';
import { TICK_INTERVAL_MS } from '../domain/constants.js';
import {
  notifications as notificationsService,
  rescheduleAllNotifications,
} from '../services/notifications.js';

// ============================================================
// Global state provider. Owns the reducer, wires createActions
// with a live getState (via ref), triggers init on mount, and
// runs a single setInterval(TICK_INTERVAL_MS) that:
//   (a) updates `tickMs` to force re-render of useNow consumers
//       (AMB-6.E)
//   (b) runs day-rollover detection
//   (c) runs rolling-30 reschedule safety net (§6.130)
// The same handler runs on `visibilitychange` so that returning
// from background re-aligns both tickMs and the rollover check.
// Changelog Fase 2 §11 (AMB-6.B, AMB-6.E) + §13 (D6, D11, D12).
//
// Sessione 7a: `AppContext` is exported (was private) so that test
// helpers can wrap UI in a stub Provider without spinning up the
// real AppProvider (which triggers repo.init() asynchronously).
// Changelog §17 (R2) / AMB-7a.L.
//
// Sessione 7d-2 CP2 (§6.49 / AMB-7d-2.B): dual-mode Provider.
// When `initialStateProp` is passed, Provider skips `repo.init()`
// and dispatches INIT_FROM_SEED to apply the seed shallow-merged
// onto initialState. This enables contract tests to assert on
// specific state shapes without the async repo boot cycle.
// In DEV, warns on console if the seed omits `status` or
// `profiloAttivo` — both are load-bearing for selectors and most
// UI paths, so their absence is almost certainly a test bug.
// No deep-merge: callers provide complete top-level fields.
//
// Sessione 9-B parte 2/2 (§6.125-§6.130, AMB-9.E'/G'): notifications
// service wired into the action factory and exposed in the context
// value. The Provider extends the existing tick/visibility handler
// with three notification triggers driven by the React lifecycle:
//   - rollover detect (post-rebuildPlan, AMB-9.G' trigger 3)
//   - rolling-30 safety net (every 30th tick, §6.130 / Q1=C)
//   - visibility/focus events (AMB-9.G' trigger 8)
// The other 5 triggers (init, commitApplyResult, cambiaProfilo,
// 7 thunks Config, setSetting toggle on/off) live inside actions.js
// closing over the same `services` singleton.
// `useApp` is re-exported as an alias of `useAppContext` for
// symmetry with consumer hooks (useNotifications imports `useApp`)
// — §6.125.
// ============================================================

export const AppContext = createContext(null);

// §6.130 — rolling reschedule safety net cadence. Every Nth tick
// reschedules even when no rollover is detected, mitigating the iOS
// PWA risk of `setTimeout` killed during background suspend.
const ROLLING_RESCHEDULE_TICKS = 30;

export function AppProvider({ children, initialStateProp }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Tick-driven re-render source for useNow. Updated every
  // TICK_INTERVAL_MS and on visibilitychange (AMB-6.E).
  const [tickMs, setTickMs] = useState(() => Date.now());

  // Live state handle so thunks read the latest value without
  // stale closures. Updated on every render.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Stable getState fn (same identity across renders).
  const getStateRef = useRef(() => stateRef.current);

  // §6.126 — services bag. Injected uniformly into createActions
  // (so thunks can call `services.notifications.cancelAll()` /
  // `rescheduleAllNotifications(state, services.notifications)`)
  // AND exposed in the context value (so React-layer hooks like
  // useNotifications can destructure `services` from useApp()).
  // The singleton `notifications` is module-scoped so production
  // and the AppContext.test.jsx stub Provider both share state —
  // tests that need isolation pass a fresh `createNotificationsService()`
  // via the test harness instead.
  const services = useMemo(
    () => ({ notifications: notificationsService }),
    []
  );

  // Action bag built once. dispatch/getState/repo/services are all stable.
  const actions = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => createActions({ dispatch, getState: getStateRef.current, repo, services }),
    [services]
  );

  // Boot. Dual-mode:
  //   - seeded: dispatch INIT_FROM_SEED, never call repo.init()
  //   - normal: invoke actions.init() (the legacy path)
  // initialStateProp intentionally NOT in deps: changing the seed
  // mid-life would silently re-dispatch INIT_FROM_SEED; callers
  // should treat it as mount-only.
  useEffect(() => {
    if (initialStateProp !== undefined) {
      if (import.meta.env.DEV) {
        if (!('status' in initialStateProp)) {
          // eslint-disable-next-line no-console
          console.warn(
            'AppProvider: initialStateProp missing "status" — selectors may misbehave'
          );
        }
        if (!('profiloAttivo' in initialStateProp)) {
          // eslint-disable-next-line no-console
          console.warn(
            'AppProvider: initialStateProp missing "profiloAttivo" — most views assume it is non-null when status==="ready"'
          );
        }
      }
      dispatch({ type: 'INIT_FROM_SEED', payload: initialStateProp });
      return;
    }
    actions.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  // Rolling-30 tick counter (§6.130). Survives across renders.
  const tickCountRef = useRef(0);

  // Single interval: tick + rollover detect + rolling-30 reschedule.
  // visibilitychange and focus use a separate handler that ALWAYS
  // reschedules on foreground return (AMB-9.G' trigger 8): the OS may
  // have killed pending setTimeouts during background suspend, so a
  // fresh reschedule on visibility regain is mandatory regardless of
  // rollover state.
  useEffect(() => {
    function maybeReschedule(s) {
      if (!s || s.status !== 'ready') return;
      if (s.impostazioni?.notifiche_attive !== 1) return;
      rescheduleAllNotifications(s, services.notifications);
    }
    const tick = () => {
      setTickMs(Date.now());
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      let didRebuild = false;
      if (selectToday(s) !== s.lastBuiltForDay) {
        actions.rebuildPlan();
        didRebuild = true;
      }
      tickCountRef.current += 1;
      const rollingDue =
        tickCountRef.current % ROLLING_RESCHEDULE_TICKS === 0;
      if (didRebuild || rollingDue) {
        // stateRef is read AFTER rebuildPlan dispatch but the dispatch
        // is async: in the didRebuild branch we may reschedule against
        // the pre-rebuild plan. The next tick (or any subsequent
        // foreground event) corrects it. AMB-9.E' (sincrona idempotente
        // cancel-then-rebuild) guarantees no leaks.
        maybeReschedule(stateRef.current);
      }
    };
    const onForegroundEvent = () => {
      setTickMs(Date.now());
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      if (selectToday(s) !== s.lastBuiltForDay) {
        actions.rebuildPlan();
      }
      maybeReschedule(stateRef.current);
    };
    const id = setInterval(tick, TICK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onForegroundEvent);
    window.addEventListener('focus', onForegroundEvent);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onForegroundEvent);
      window.removeEventListener('focus', onForegroundEvent);
    };
  }, [actions, services]);

  // Dev-only console handle. Namespaced under window.__pt.app to
  // coexist with devCheck.js helpers (window.__pt.db/repo/...).
  useEffect(() => {
    // §6.143: gate widened to allow VITE_PT_TOOLING=1 build (CP browser tooling without HMR).
    if (!import.meta.env.DEV && !import.meta.env.VITE_PT_TOOLING) return;
    if (typeof window === 'undefined') return;
    window.__pt = window.__pt || {};
    window.__pt.app = {
      getState: () => stateRef.current,
      actions,
    };
    // §6.126 — Expose notifications service handle for browser testing
    // (CP browser punti 1-2: `__pt.notifications.getPendingCount()`).
    window.__pt.notifications = services.notifications;
    return () => {
      if (window.__pt) {
        delete window.__pt.app;
        delete window.__pt.notifications;
      }
    };
  }, [actions, services]);

  // §6.126 — `services` exposed in the context value alongside
  // state/actions/tickMs. Hook consumers (useNotifications) read it.
  const value = useMemo(
    () => ({ state, actions, tickMs, services }),
    [state, actions, tickMs, services]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext: AppProvider is missing in the React tree');
  }
  return ctx;
}

// §6.125 — Alias for hook consumers that prefer the shorter `useApp`
// name (Sessione 9-B CP3 §6.123 useNotifications imports `useApp`).
// The canonical export remains `useAppContext`; this alias is purely
// a naming shortcut and shares the same identity, so existing tests
// that mock `useAppContext` continue to work without changes.
export const useApp = useAppContext;
