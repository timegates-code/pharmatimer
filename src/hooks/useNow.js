// ============================================================
// useNow — UI hook for reactive "now".
// Consumers re-render on two triggers only:
//   1. state changes (reducer dispatch, incl. SET_SIMULATED_NOW)
//   2. tickMs changes (Provider's setInterval TICK_INTERVAL_MS)
// Both travel through the AppContext value, so a single
// useAppContext() call is enough to wire the reactivity.
// See AMB-6.D, AMB-6.E, AMB-6.F in Changelog Fase 2 §11.
// ============================================================

import { useAppContext } from '../state/AppContext.jsx';
import { resolveNow } from '../utils/now.js';

/**
 * Returns the effective "now" snapshot: see AMB-6.F shape.
 *
 * Throws via `useAppContext` if called outside `<AppProvider>`.
 * MUST NOT be invoked inside `AppContext.jsx` itself to avoid
 * circular dependency on the context it defines.
 *
 * @returns {{
 *   date: Date,
 *   dateStr: string,
 *   hhmm: string,
 *   minutes: number,
 *   isSimulated: boolean,
 * }}
 */
export function useNow() {
  const { state, tickMs } = useAppContext();
  // `tickMs` is destructured to document intent: reading it from the
  // context value is what makes this hook re-run every TICK_INTERVAL_MS.
  // (In practice the context value identity alone triggers re-render;
  // destructuring tickMs keeps the dependency explicit for readers.)
  void tickMs;
  return resolveNow(state, new Date());
}
