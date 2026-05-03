// ErrorSurface tests. CP1 of Step 11-A CP1b (AMB-11.A.3).
//
// Coverage:
//   1. No render when state.error is null
//   2. Toast renders for severity 'warning'; auto-dismiss after 4s
//   3. Toast renders for severity 'error'; auto-dismiss after 4s
//   4. Banner renders for severity 'critical'; NO auto-dismiss; code shown
//   5. Manual dismiss click dispatches CLEAR_ERROR (toast)
//   6. Legacy shape (no severity field) defaults to toast (backward-compat)
//
// Mocking strategy: vi.mock overrides the AppContext + useTheme stubs at
// module-resolution time. mockState is a let-binding that the mocked
// useAppContext closes over — reassigning before each test changes what
// the component reads at render time. mockDispatch is a vi.fn cleared in
// beforeEach.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import ErrorSurface from './ErrorSurface.jsx';

const mockDispatch = vi.fn();
let mockState = { error: null };

vi.mock('../../state/AppContext.jsx', () => ({
  useAppContext: () => ({ state: mockState, dispatch: mockDispatch }),
}));

vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    tokens: {
      // colors used by ErrorSurface — values are not asserted, only presence
      redBg: '#FEF2F2',
      red: '#B91C1C',
      redTx: '#991B1B',
      amberBg: '#FEF3C7',
      amberTx: '#92400E',
      warnBd: '#FED7AA',
      modalAlertBg: '#FEF2F2',
      modalAlertBd: '#FECACA',
      modalAlertTx: '#991B1B',
    },
    mode: 'light',
  }),
}));

describe('ErrorSurface', () => {
  beforeEach(() => {
    mockState = { error: null };
    mockDispatch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders nothing when state.error is null', () => {
    mockState = { error: null };
    const { container } = render(<ErrorSurface />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toast for severity warning and auto-dismisses after 4s', () => {
    mockState = {
      error: { severity: 'warning', message: 'Attenzione', kind: 'repo' },
    };
    render(<ErrorSurface />);

    expect(screen.getByTestId('error-surface-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('error-surface-banner')).toBeNull();
    expect(screen.getByText('Attenzione')).toBeInTheDocument();

    // Just before 4s — no dispatch yet
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(mockDispatch).not.toHaveBeenCalled();

    // Cross 4s threshold — CLEAR_ERROR dispatched
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_ERROR' });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('renders toast for severity error and auto-dismisses after 4s', () => {
    mockState = {
      error: { severity: 'error', message: 'Errore generico', kind: 'repo' },
    };
    render(<ErrorSurface />);

    expect(screen.getByTestId('error-surface-toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_ERROR' });
  });

  it('renders banner for severity critical without auto-dismiss and shows code', () => {
    mockState = {
      error: {
        severity: 'critical',
        message: 'DB non disponibile',
        kind: 'repo',
        code: 'DB_UNAVAILABLE',
      },
    };
    render(<ErrorSurface />);

    expect(screen.getByTestId('error-surface-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('error-surface-toast')).toBeNull();
    expect(screen.getByText('DB non disponibile')).toBeInTheDocument();
    expect(screen.getByTestId('error-surface-code')).toHaveTextContent('[DB_UNAVAILABLE]');

    // Wait well beyond toast dismiss window — no auto-dispatch
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches CLEAR_ERROR when the close button is clicked', () => {
    mockState = {
      error: { severity: 'warning', message: 'X', kind: 'repo' },
    };
    render(<ErrorSurface />);

    fireEvent.click(screen.getByTestId('error-surface-dismiss'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_ERROR' });
  });

  it('defaults to toast (severity error) when severity field is missing — backward-compat with CP1a legacy shape', () => {
    mockState = {
      error: { kind: 'unknown', message: 'Legacy error from before CP1a' },
    };
    render(<ErrorSurface />);

    expect(screen.getByTestId('error-surface-toast')).toBeInTheDocument();
    expect(screen.queryByTestId('error-surface-banner')).toBeNull();
  });
});
