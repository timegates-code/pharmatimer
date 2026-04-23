// ============================================================
// AppContext / AppProvider — dual-mode contract tests.
// ============================================================
//
// Scope Sessione 7d-2 CP2 (§6.49 / AMB-7d-2.B):
//   (A) When initialStateProp is passed, Provider does NOT invoke
//       any repo method (init path is skipped).
//   (B) Post-mount state reflects seed via shallow spread.
//
// Strategy: mock `../data/repository/index.js` with a repo whose
// methods are all vi.fn stubs. Render AppProvider with a seed,
// then:
//   - verify no repo fetch method was called
//   - capture state via a Probe child and assert shape
//
// Environment: jsdom (default) — React rendering required.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';

// Hoisted mock so vi.mock factory below can close over the stub.
const { repoMock } = vi.hoisted(() => {
  const mk = (val) => vi.fn().mockResolvedValue(val);
  return {
    repoMock: {
      getProfili: mk([]),
      getProfiloAttivo: mk(null),
      getFarmaci: mk([]),
      getAllOrari: mk([]),
      getLogByData: mk([]),
      getLogByRange: mk([]),
      getLogByFarmacoData: mk([]),
      getAllSettings: mk({}),
      // init()-only reads above; include extras defensively so any future
      // expansion of actions.init() doesn't silently pass through.
      upsertLogsBatch: mk([]),
      setProfiloAttivo: mk(undefined),
      setProfiloAttivoConCleanup: mk(undefined),
      setSetting: mk(undefined),
    },
  };
});

vi.mock('../data/repository/index.js', () => ({ repo: repoMock }));

// Import AFTER vi.mock so the mocked module is in the import graph.
import { AppProvider, useAppContext } from './AppContext.jsx';

/**
 * Minimal consumer that forwards state updates to a spy.
 * Used to observe post-dispatch state without relying on timing.
 */
function Probe({ onState }) {
  const ctx = useAppContext();
  useEffect(() => {
    onState(ctx.state);
  }, [ctx.state, onState]);
  return null;
}

describe('AppProvider — dual-mode (Sessione 7d-2 CP2)', () => {
  beforeEach(() => {
    // Reset call history on each method between tests; preserves
    // mockResolvedValue configuration.
    Object.values(repoMock).forEach((fn) => fn.mockClear());
  });

  it('does not invoke any repo fetch method when initialStateProp is provided', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: null,
    };

    render(
      <AppProvider initialStateProp={seed}>
        <div data-testid="child">child</div>
      </AppProvider>
    );

    // Flush microtasks + a macrotask so any async init() chain would have
    // started its first await (and thus touched repoMock). If the seed
    // path is honored, no method is ever called.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(repoMock.getProfili).not.toHaveBeenCalled();
    expect(repoMock.getProfiloAttivo).not.toHaveBeenCalled();
    expect(repoMock.getFarmaci).not.toHaveBeenCalled();
    expect(repoMock.getAllOrari).not.toHaveBeenCalled();
    expect(repoMock.getLogByData).not.toHaveBeenCalled();
    expect(repoMock.getAllSettings).not.toHaveBeenCalled();
  });

  it('applies initialStateProp via shallow spread; untouched fields keep initialState defaults', async () => {
    const seed = {
      status: 'ready',
      profiloAttivo: { id: 7, nome_profilo: 'Test' },
    };
    const captured = [];

    render(
      <AppProvider initialStateProp={seed}>
        <Probe onState={(s) => captured.push(s)} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(captured.some((s) => s.status === 'ready')).toBe(true);
    });

    const last = captured.at(-1);
    // Seed fields applied.
    expect(last.status).toBe('ready');
    expect(last.profiloAttivo).toEqual({ id: 7, nome_profilo: 'Test' });
    // §6.77 cleanup: state.nomeUtente mirror rimosso — non deve apparire
    // nello state anche se il seed non lo cita.
    expect(last).not.toHaveProperty('nomeUtente');
    // Non-seeded fields preserved from initialState (NOT wiped).
    expect(last.plan).toEqual([]);
    expect(last.presoStack).toEqual([]);
    expect(last.impostazioni).toEqual({});
    expect(last.error).toBeNull();
  });
});
