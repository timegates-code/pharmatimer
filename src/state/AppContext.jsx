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
import { canalePush as canalePushService } from '../services/canalePush.js';

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
  // The reminder channel ad app chiusa (client of branch A, step 2) joins
  // the bag the same way: one module-scoped instance, so the toggle's hook
  // and the thunks share its preparation.
  const services = useMemo(
    () => ({ notifications: notificationsService, canale: canalePushService }),
    []
  );

  // Action bag built once. dispatch/getState/repo/services are all stable.
  const actions = useMemo(
    // deps volutamente incomplete -- react-hooks non e installato in eslint.config.js
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
    // deps volutamente incomplete -- react-hooks non e installato in eslint.config.js
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
      // SENTINEL_QOCT_TICK_DRAIN
      // Spec 14.2.4 -- trigger 4. Throttled inside the thunk, so a tick
      // every 60s cannot hammer the queue. Placed AFTER the ready guard:
      // a successful drain calls rebuildPlan, which needs a built plan.
      actions.drainOutbox();
    };
    const onForegroundEvent = () => {
      setTickMs(Date.now());
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      if (selectToday(s) !== s.lastBuiltForDay) {
        actions.rebuildPlan();
      }
      maybeReschedule(stateRef.current);
      // SENTINEL_QOCT_FOREGROUND_DRAIN
      // Spec 14.2.2 -- trigger 2, on the existing visibilitychange/focus
      // handler.
      actions.drainOutbox();
      // Client of the reminder channel, step 2: the renewal at every return
      // to the foreground. visibilitychange also fires when the page goes
      // hidden, and there is nothing to renew then. focus and
      // visibilitychange arrive together: the service merges the two.
      if (document.visibilityState !== 'hidden') {
        actions.rinnovaCanale();
        // Step 3: and the calendar, on the state as it is now. Unchanged
        // content goes nowhere (Q-SYNC).
        actions.pubblicaCanale(stateRef.current);
        // Step 4: and its state, read again.
        actions.leggiStatoCanale();
      }
    };
    // SENTINEL_QOCT_ONLINE_LISTENER
    // Spec 14.2.3 -- trigger 3. A DEDICATED handler, NOT a reuse of
    // onForegroundEvent: connectivity is not foreground, and reusing it
    // would reschedule every notification on every network flap. The
    // event is only a HINT (Spec 14.2.3) -- the proof is the delivery
    // itself -- so it does nothing but ask for a pass. No `offline`
    // listener and no persistent stop: deviation s.6.271.
    const onOnline = () => {
      actions.drainOutbox();
    };
    const id = setInterval(tick, TICK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onForegroundEvent);
    window.addEventListener('focus', onForegroundEvent);
    // SENTINEL_QOCT_ONLINE_REGISTER
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onForegroundEvent);
      window.removeEventListener('focus', onForegroundEvent);
      window.removeEventListener('online', onOnline);
    };
  }, [actions, services]);

  // Ratification A of 2026-10-01 (client of the reminder channel, step 3):
  // ONE seat on the state React has committed, for the page timers and for
  // the calendar the phone publishes. The seats of maybeReschedule
  // in actions.js read stateRef, which follows a dispatch one render later:
  // measured, the one of init arms nothing at a cold opening and the one of
  // addFarmaco re-arms the plan without the new farmaco. Here the page timers
  // are re-armed on the plan as it is, when the app becomes ready and at
  // every change of plan, farmaci, active profile or toggle. Idempotent
  // (cancel-then-rebuild), and a re-arm never starts again a notification
  // already shown (services/notifications.js). The old seats stay: harmless
  // duplicates.
  useEffect(() => {
    if (state.status !== 'ready') return;
    if (state.impostazioni?.notifiche_attive !== 1) return;
    rescheduleAllNotifications(state, services.notifications);
    // The calendar of the channel, from the same seat and the same state.
    actions.pubblicaCanale(state);
    // deps volutamente incomplete -- react-hooks non e installato in eslint.config.js
  }, [
    state.status,
    state.plan,
    state.farmaci,
    state.profiloAttivo,
    state.impostazioni?.notifiche_attive,
    services,
    actions,
  ]);

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
