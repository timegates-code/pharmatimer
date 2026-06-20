// @vitest-environment node
// ============================================================
// F14 BUG-l -- addFarmaco / updateFarmaco post-commit best-effort contract.
// ============================================================
//
// Regression for the silent-duplicate bug: a successful withTransaction means
// the farmaco IS persisted, so the thunk MUST return {ok:true}. A failure in
// the post-commit refresh (refetch / rebuildPlan / reschedule) is surfaced as
// a non-fatal SET_ERROR severity:'warning' but does NOT flip the result to
// {ok:false} (which kept the drawer open and let the user re-submit).
//
// Harness mirrors actions.farmaci.test.js (self-contained copy: the helpers
// there are not exported). withTransaction is a pass-through so the body runs
// without a real IDB transaction.

import { describe, it, expect, vi } from 'vitest';
import { createActions } from './actions.js';

const P_ATTIVO = {
  id: 1, nome_profilo: 'Standard',
  ora_sveglia: '07:00', ora_colazione: '07:30',
  ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
  attivo: 1,
};

function makeDeps({ stateOverrides = {}, repoOverrides = {} } = {}) {
  const dispatched = [];
  const dispatch = (a) => dispatched.push(a);

  const state = {
    profili: [P_ATTIVO],
    profiloAttivo: P_ATTIVO,
    farmaci: [],
    orari: [],
    plan: [],
    simulatedNow: null,
    ...stateOverrides,
  };
  const getState = () => state;

  const repo = {
    addFarmaco: vi.fn().mockResolvedValue(77),
    updateFarmaco: vi.fn().mockResolvedValue(undefined),
    deleteFarmaco: vi.fn().mockResolvedValue(undefined),
    replaceOrariForFarmaco: vi.fn().mockResolvedValue(undefined),
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    getLogByRange: vi.fn().mockResolvedValue([]),
    withTransaction: vi.fn().mockImplementation(async (_mode, _stores, fn) => fn()),
    ...repoOverrides,
  };

  return { dispatched, dispatch, getState, repo };
}

const FARMACO_NEW = {
  nome: 'Medrol',
  principio_attivo: 'metilprednisolone',
  funzione: 'Corticosteroide',
  tipo_frequenza: 'fisso',
  intervallo_ore: null,
  intervallo_minimo_ore: null,
  dosi_giornaliere: 2,
  relazione_pasto: 'dopo',
  dettaglio_pasto: null,
  note: null,
  data_inizio: '2026-04-24',
  data_fine: null,
};

const ORARI_NEW = [
  { dose_numero: 1, offset_minuti: 0,   ancora_riferimento: 'colazione', descrizione_momento: null },
  { dose_numero: 2, offset_minuti: 360, ancora_riferimento: 'colazione', descrizione_momento: null },
];

describe('F14 BUG-l — addFarmaco post-commit best-effort', () => {
  it('post-commit fail (refetch throw): farmaco persistito una sola volta, ritorna {ok:true,id}, SET_ERROR severity warning', async () => {
    // Commit succeeds (addFarmaco -> 77, replaceOrari ok); the post-commit
    // refetch throws (stands in for any post-commit step: refetch / rebuild /
    // maybeReschedule). The save MUST NOT be reported as failed.
    const repoOverrides = {
      getFarmaci: vi.fn().mockRejectedValue(new Error('refetch boom')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addFarmaco(FARMACO_NEW, ORARI_NEW);

    // Contract: commit ok => {ok:true,id}, NEVER {ok:false}.
    expect(result).toEqual({ ok: true, id: 77 });

    // Persisted exactly once (the anti-duplicate guarantee).
    expect(repo.addFarmaco).toHaveBeenCalledTimes(1);

    // Post-commit failure surfaced as a NON-fatal warning.
    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload.severity).toBe('warning');
  });

  it('tx-write fail (addFarmaco throw): ritorna {ok:false}, SET_ERROR severity error, nessun SET_FARMACI', async () => {
    // Restructure must preserve the write-failure path unchanged.
    const repoOverrides = {
      addFarmaco: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addFarmaco(FARMACO_NEW, ORARI_NEW);

    expect(result).toEqual({ ok: false });
    expect(dispatched.find((a) => a.type === 'SET_FARMACI')).toBeUndefined();
    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload).toMatchObject({ kind: 'repo', severity: 'error', message: 'DB write failed' });
  });
});

describe('F14 BUG-l — updateFarmaco post-commit best-effort', () => {
  it('post-commit fail (refetch throw): update committato una sola volta, ritorna {ok:true}, SET_ERROR severity warning', async () => {
    const repoOverrides = {
      getFarmaci: vi.fn().mockRejectedValue(new Error('refetch boom')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.updateFarmaco(1, { nome: 'Medrol 16mg' }, []);

    expect(result).toEqual({ ok: true });
    expect(repo.updateFarmaco).toHaveBeenCalledTimes(1);

    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload.severity).toBe('warning');
  });
});
