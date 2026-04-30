// ============================================================
// UpdatePrompt.test — Sessione 10-B CP4 (AMB-10.G).
// Mocks `useTheme` and the `registerSW` module to exercise the
// component in isolation.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock useTheme: returns a stable token map, dark=false (light mode).
vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    dark: false,
    mode: 'auto',
    tokens: {
      modalBg: '#FFFFFF',
      headerBorder: '#E7E5E0',
      textPrimary: '#1C1917',
      textSecondary: '#57534E',
      textMuted: '#A8A29E',
      blue: '#2563EB',
    },
  }),
}));

// Mock the registerSW module: capture the listener registered by
// subscribeUpdateAvailable so the test body can drive flag changes.
const triggerUpdateMock = vi.fn();
let capturedListener = null;

vi.mock('../../pwa/registerSW.js', () => ({
  subscribeUpdateAvailable: (cb) => {
    capturedListener = cb;
    cb(false); // late-subscriber sync: default flag is false
    return () => {
      capturedListener = null;
    };
  },
  triggerUpdate: () => triggerUpdateMock(),
}));

import UpdatePrompt from './UpdatePrompt.jsx';

describe('UpdatePrompt', () => {
  beforeEach(() => {
    triggerUpdateMock.mockClear();
    capturedListener = null;
  });

  it('does not render when no update is available', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the toast and triggers update when "Ricarica" is clicked', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    // Drive the subscriber: simulate SW notification.
    act(() => capturedListener(true));

    const toast = await screen.findByRole('alert');
    expect(toast).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ricarica/i }));
    expect(triggerUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('dismiss button hides the toast without triggering update', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    act(() => capturedListener(true));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /chiudi notifica/i })
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(triggerUpdateMock).not.toHaveBeenCalled();
  });
});
