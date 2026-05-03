// ErrorAnnouncer tests — CP4 (AMB-11.A.9, Q2=A).
//
// Coverage of the 3 conditional branches:
//   1. state.error === null              → aria-live="polite", empty text
//   2. severity ∈ {warning, error}       → aria-live="polite", message rendered
//   3. severity === 'critical'           → aria-live="assertive", message rendered
//
// Mocking: vi.mock overrides the AppContext stub at module-resolution time;
// mockState is rebound before each test.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorAnnouncer from './ErrorAnnouncer.jsx';

let mockState = { error: null };

vi.mock('../../state/AppContext.jsx', () => ({
  useAppContext: () => ({ state: mockState }),
}));

describe('ErrorAnnouncer', () => {
  beforeEach(() => {
    mockState = { error: null };
  });

  afterEach(() => cleanup());

  it('mounts an empty polite live region when state.error is null', () => {
    mockState = { error: null };
    render(<ErrorAnnouncer />);

    const region = screen.getByTestId('error-announcer');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
    expect(region.textContent).toBe('');
  });

  it('uses aria-live="polite" for severity warning/error and renders the message', () => {
    mockState = {
      error: { severity: 'error', message: 'Operazione fallita', kind: 'repo' },
    };
    render(<ErrorAnnouncer />);

    const region = screen.getByTestId('error-announcer');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Operazione fallita');
  });

  it('uses aria-live="assertive" for severity critical and renders the message', () => {
    mockState = {
      error: {
        severity: 'critical',
        message: 'Database non disponibile',
        kind: 'repo',
        code: 'DB_UNAVAILABLE',
      },
    };
    render(<ErrorAnnouncer />);

    const region = screen.getByTestId('error-announcer');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toHaveTextContent('Database non disponibile');
  });
});
