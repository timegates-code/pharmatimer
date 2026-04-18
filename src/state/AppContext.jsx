import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { initialState, reducer } from './reducer.js';
import { selectToday } from './selectors.js';
import { createActions } from './actions.js';
import { repo } from '../data/repository/index.js';

// ============================================================
// Global state provider. Owns the reducer, wires createActions
// with a live getState (via ref), triggers init on mount, and
// detects day rollover (setInterval 60s + visibilitychange).
// Changelog Fase 2 §11 + §13 (D6, D11, D12).
// ============================================================

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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

  // Boot.
  useEffect(() => {
    actions.init();
  }, [actions]);

  // Day rollover detection: setInterval 60s + visibilitychange.
  useEffect(() => {
    const check = () => {
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      if (selectToday(s) !== s.lastBuiltForDay) {
        actions.rebuildPlan();
      }
    };
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
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

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext: AppProvider is missing in the React tree');
  }
  return ctx;
}
