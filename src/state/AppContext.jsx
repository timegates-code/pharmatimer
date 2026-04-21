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

// ============================================================
// Global state provider. Owns the reducer, wires createActions
// with a live getState (via ref), triggers init on mount, and
// runs a single setInterval(TICK_INTERVAL_MS) that:
//   (a) updates `tickMs` to force re-render of useNow consumers
//       (AMB-6.E)
//   (b) runs day-rollover detection
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
// ============================================================

export const AppContext = createContext(null);

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

  // Action bag built once. dispatch/getState/repo are all stable.
  const actions = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => createActions({ dispatch, getState: getStateRef.current, repo }),
    []
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

  // Single interval: tick + rollover detect. Reused by visibilitychange
  // so that returning from background triggers both a fresh tickMs and
  // an immediate rollover check.
  useEffect(() => {
    const tick = () => {
      setTickMs(Date.now());
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      if (selectToday(s) !== s.lastBuiltForDay) {
        actions.rebuildPlan();
      }
    };
    const id = setInterval(tick, TICK_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [actions]);

  // Dev-only console handle. Namespaced under window.__pt.app to
  // coexist with devCheck.js helpers (window.__pt.db/repo/...).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === 'undefined') return;
    window.__pt = window.__pt || {};
    window.__pt.app = {
      getState: () => stateRef.current,
      actions,
    };
    return () => {
      if (window.__pt) delete window.__pt.app;
    };
  }, [actions]);

  const value = useMemo(
    () => ({ state, actions, tickMs }),
    [state, actions, tickMs]
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
