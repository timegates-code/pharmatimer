// ============================================================
// completeOnboarding thunk unit tests — Sessione v3.0.0 Step 1 CP2.
// ============================================================
// 3 tests covering the par.6.168 thunk:
//   1. mode='empty' + nome valido -> 2 setSetting calls (nome + flag)
//   2. mode='empty' + nome empty -> 1 setSetting call (only flag)
//   3. mode='demo' (CP4 placeholder) -> 2 setSetting calls, no seed
//
// Pattern: createActions invoked directly with mocked deps (dispatch,
// getState, repo, services) — same shape used by AppProvider, no React
// rendering required.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActions } from './actions.js';

function createTestHarness() {
  const dispatch = vi.fn();
  let state = { status: 'ready', impostazioni: {}, farmaci: [] };
  const getState = () => state;
  const repo = {
    setSetting: vi.fn().mockResolvedValue(undefined),
  };
  const services = {
    notifications: {
      cancelAll: vi.fn(),
      showDoseNotification: vi.fn(),
    },
  };
  const actions = createActions({ dispatch, getState, repo, services });
  return { actions, dispatch, repo, services };
}

describe('completeOnboarding thunk (par.6.168)', () => {
  let harness;
  beforeEach(() => {
    harness = createTestHarness();
  });

  it("mode='empty' + nome valido: 2 setSetting calls (nome + onboarding_completed)", async () => {
    const result = await harness.actions.completeOnboarding('Roberto', 'empty');

    expect(result).toEqual({ ok: true });
    expect(harness.repo.setSetting).toHaveBeenCalledTimes(2);
    expect(harness.repo.setSetting).toHaveBeenNthCalledWith(
      1,
      'nome_utente',
      'Roberto'
    );
    expect(harness.repo.setSetting).toHaveBeenNthCalledWith(
      2,
      'onboarding_completed',
      1
    );
  });

  it("mode='empty' + nome empty (whitespace only): 1 setSetting call (only flag)", async () => {
    const result = await harness.actions.completeOnboarding('   ', 'empty');

    expect(result).toEqual({ ok: true });
    expect(harness.repo.setSetting).toHaveBeenCalledTimes(1);
    expect(harness.repo.setSetting).toHaveBeenCalledWith(
      'onboarding_completed',
      1
    );
    // Verify nome_utente NOT written (whitespace-only trim is empty)
    expect(harness.repo.setSetting).not.toHaveBeenCalledWith(
      'nome_utente',
      expect.anything()
    );
  });

  it("mode='demo' (CP4 placeholder): 2 setSetting calls + no seed I/O", async () => {
    const result = await harness.actions.completeOnboarding('Mario', 'demo');

    expect(result).toEqual({ ok: true });
    // Same 2 IDB writes as 'empty' — seed loading is deferred to CP4.
    expect(harness.repo.setSetting).toHaveBeenCalledTimes(2);
    expect(harness.repo.setSetting).toHaveBeenNthCalledWith(
      1,
      'nome_utente',
      'Mario'
    );
    expect(harness.repo.setSetting).toHaveBeenNthCalledWith(
      2,
      'onboarding_completed',
      1
    );
    // Notifications service untouched (no scheduling at onboarding time)
    expect(harness.services.notifications.cancelAll).not.toHaveBeenCalled();
    expect(
      harness.services.notifications.showDoseNotification
    ).not.toHaveBeenCalled();
  });
});
