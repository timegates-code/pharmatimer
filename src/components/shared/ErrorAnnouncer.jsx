// ============================================================
// ErrorAnnouncer — global ARIA live region for state.error.
//
// Sessione Step 11-A CP1b CP4 (AMB-11.A.9, Q2=A):
//   Reads state.error from AppContext and exposes it to assistive
//   technologies through a visually-hidden (sr-only) live region.
//   Reuses state.error directly — no new state slice (Q2=A).
//
//   severity ∈ {warning, error, undefined}  → aria-live="polite"
//                                             (queued announcement, does not
//                                              interrupt the user)
//
//   severity === 'critical'                 → aria-live="assertive"
//                                             (interrupts immediately, used
//                                              for DB unavailable / repo
//                                              transaction abort)
//
// When state.error is null the live region is mounted with empty text
// content but aria-live="polite" stays active — the channel must be
// present in the DOM BEFORE state.error transitions from null to a value,
// otherwise screen readers won't pick up the change (race rule).
//
// aria-atomic="true" forces the SR to announce the entire content of the
// region on every change, instead of trying to compute a diff.
//
// Pattern A (separate component) chosen over inlining in App.jsx to keep
// App() declarative and ErrorSurface focused on the visible surface.
// Pattern C (live region inside ErrorSurface) was rejected because
// ErrorSurface null-renders when state.error is null — the live region
// would not be mounted in time for the first announcement.
// ============================================================

import { useAppContext } from '../../state/AppContext.jsx';

export default function ErrorAnnouncer() {
  const { state } = useAppContext();
  const error = state.error;
  const severity = error?.severity ?? 'error';
  const liveLevel = severity === 'critical' ? 'assertive' : 'polite';
  const message = error?.message ?? '';

  return (
    <div
      aria-live={liveLevel}
      aria-atomic="true"
      className="sr-only"
      data-testid="error-announcer"
    >
      {message}
    </div>
  );
}
