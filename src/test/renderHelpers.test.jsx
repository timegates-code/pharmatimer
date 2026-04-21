// renderHelpers — 1 test for the 7d-1 refactor (§6.39, AMB-7d-1.I).
//
// Verifies that `rerender` of a component that calls `useAppContext` works
// WITHOUT throwing "AppProvider is missing in the React tree". This is the
// scenario that failed pre-refactor (external <Provider> wrap) and that
// the `wrapper` option fixes.

import { describe, it, expect } from 'vitest';
import { renderWithProvider } from './renderHelpers.jsx';
import { useAppContext } from '../state/AppContext.jsx';

// A trivial consumer: reads something stable from context and renders it.
// We pick `tickMs` because it's always present in the value shape built by
// renderWithProvider (no state.* dependency, no type coupling).
function TickMsConsumer({ label }) {
  const { tickMs } = useAppContext();
  return (
    <div>
      <span data-testid="label">{label}</span>
      <span data-testid="tick">{String(tickMs)}</span>
    </div>
  );
}

describe('renderHelpers.renderWithProvider (7d-1 wrapper refactor)', () => {
  it('rerender preserves the AppContext.Provider wrapper', () => {
    const { getByTestId, rerender } = renderWithProvider(
      <TickMsConsumer label="first" />
    );
    // Initial render: consumer can read context → no throw.
    expect(getByTestId('label').textContent).toBe('first');
    const firstTick = getByTestId('tick').textContent;
    expect(firstTick).toMatch(/^\d+$/);

    // This is the line that used to throw before §6.39 refactor.
    rerender(<TickMsConsumer label="second" />);

    // After rerender: consumer still reads context → still no throw.
    expect(getByTestId('label').textContent).toBe('second');
    // tickMs is stable within a single renderWithProvider call — the same
    // wrapper instance owns the same value object across rerenders.
    expect(getByTestId('tick').textContent).toBe(firstTick);
  });
});
