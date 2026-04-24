// @vitest-environment node
// ============================================================
// actions.addFarmaco / updateFarmaco / deleteFarmaco — thunk tests
// (Sessione 8c-2 CP5 / §11 v2.5.28 / §6.93 refetch orari).
// ============================================================
//
// Scope (6 scenarios, split-per-concern §6.87):
//   (1) addFarmaco success: withTransaction runs body that calls
//       repo.addFarmaco({..., attivo:1}) + replaceOrariForFarmaco(newId, orari);
//       post-commit refetch farmaci+orari; SET_FARMACI + SET_ORARI dispatched;
//       rebuildPlan triggered (getLogByRange invoked); returns {ok:true, id}.
//   (2) addFarmaco repo-fail: SET_ERROR kind:'repo' dispatched,
//       no SET_FARMACI, returns {ok:false}.
//   (3) updateFarmaco with orari: repo.updateFarmaco(id, patch) +
//       replaceOrariForFarmaco(id, orari) both invoked inside tx.
//   (4) updateFarmaco without orari (undefined): replaceOrariForFarmaco
//       NOT invoked; repo.updateFarmaco still runs.
//   (5) deleteFarmaco success: repo.deleteFarmaco(id) (soft via attivo=0);
//       refetch farmaci+orari; SET_FARMACI + SET_ORARI + rebuildPlan.
//   (6) deleteFarmaco repo-fail: SET_ERROR, no SET_FARMACI, {ok:false}.
//
// Pattern: vi.fn repo + createActions closure + dispatched[] capture,
// mirroring actions.profili.test.js. `withTransaction` is mocked as a
// pass-through `async (mode, stores, fn) => fn()` so the thunk body
// executes without a real IDB transaction.

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

describe('actions.addFarmaco', () => {
  it('(1) success: tx body chiama addFarmaco+replaceOrari, dispatcha SET_FARMACI+SET_ORARI, triggera rebuildPlan, ritorna {ok,id}', async () => {
    const { dispatched, dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addFarmaco(FARMACO_NEW, ORARI_NEW);

    expect(result).toEqual({ ok: true, id: 77 });

    // Transaction wrapper invoked with farmaci+orari_base stores.
    expect(repo.withTransaction).toHaveBeenCalledTimes(1);
    const [modeArg, storesArg] = repo.withTransaction.mock.calls[0];
    expect(modeArg).toBe('rw');
    expect(storesArg).toEqual(['farmaci', 'orari_base']);

    // Repo writes inside the tx body.
    expect(repo.addFarmaco).toHaveBeenCalledTimes(1);
    expect(repo.addFarmaco.mock.calls[0][0]).toMatchObject({
      nome: 'Medrol', attivo: 1,
    });
    expect(repo.replaceOrariForFarmaco).toHaveBeenCalledWith(77, ORARI_NEW);

    // Post-commit refetch.
    expect(repo.getFarmaci).toHaveBeenCalledTimes(1);
    expect(repo.getAllOrari).toHaveBeenCalledTimes(1);

    // State mutations (§6.93: both slices).
    const setF = dispatched.find((a) => a.type === 'SET_FARMACI');
    const setO = dispatched.find((a) => a.type === 'SET_ORARI');
    expect(setF).toBeDefined();
    expect(setO).toBeDefined();

    // rebuildPlan triggered (getLogByRange is the tell — it is the
    // first repo call inside rebuildPlan).
    expect(repo.getLogByRange).toHaveBeenCalledTimes(1);

    // No error surfaced.
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });

  it('(2) repo-fail: SET_ERROR kind:repo, nessun SET_FARMACI, ritorna {ok:false}', async () => {
    const repoOverrides = {
      // Fail inside the tx body — withTransaction passes the rejection through.
      addFarmaco: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addFarmaco(FARMACO_NEW, ORARI_NEW);

    expect(result).toEqual({ ok: false });
    expect(dispatched.find((a) => a.type === 'SET_FARMACI')).toBeUndefined();
    expect(dispatched.find((a) => a.type === 'SET_ORARI')).toBeUndefined();

    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload).toMatchObject({ kind: 'repo', message: 'DB write failed' });
  });
});

describe('actions.updateFarmaco', () => {
  it('(3) con orari: updateFarmaco + replaceOrariForFarmaco invocati nella tx', async () => {
    const { dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    const patch = { nome: 'Medrol 16mg', note: 'riduzione' };
    const result = await actions.updateFarmaco(5, patch, ORARI_NEW);

    expect(result).toEqual({ ok: true });
    expect(repo.updateFarmaco).toHaveBeenCalledWith(5, patch);
    expect(repo.replaceOrariForFarmaco).toHaveBeenCalledWith(5, ORARI_NEW);
  });

  it('(4) senza orari (undefined): replaceOrariForFarmaco NON invocato', async () => {
    const { dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    const patch = { data_fine: '2025-12-31' };
    const result = await actions.updateFarmaco(5, patch, undefined);

    expect(result).toEqual({ ok: true });
    expect(repo.updateFarmaco).toHaveBeenCalledWith(5, patch);
    expect(repo.replaceOrariForFarmaco).not.toHaveBeenCalled();
  });
});

describe('actions.deleteFarmaco', () => {
  it('(5) success: soft-delete, rifetch farmaci+orari, SET_FARMACI+SET_ORARI+rebuildPlan, {ok}', async () => {
    const { dispatched, dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.deleteFarmaco(5);

    expect(result).toEqual({ ok: true });
    expect(repo.deleteFarmaco).toHaveBeenCalledWith(5);
    // No tx wrapper for single-row soft-delete.
    expect(repo.withTransaction).not.toHaveBeenCalled();
    // Refetch both slices (§6.93).
    expect(repo.getFarmaci).toHaveBeenCalledTimes(1);
    expect(repo.getAllOrari).toHaveBeenCalledTimes(1);
    expect(dispatched.find((a) => a.type === 'SET_FARMACI')).toBeDefined();
    expect(dispatched.find((a) => a.type === 'SET_ORARI')).toBeDefined();
    // rebuildPlan triggered.
    expect(repo.getLogByRange).toHaveBeenCalledTimes(1);
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });

  it('(6) repo-fail: SET_ERROR, nessun SET_FARMACI, ritorna {ok:false}', async () => {
    const repoOverrides = {
      deleteFarmaco: vi.fn().mockRejectedValue(new Error('IDB delete failed')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.deleteFarmaco(5);

    expect(result).toEqual({ ok: false });
    expect(dispatched.find((a) => a.type === 'SET_FARMACI')).toBeUndefined();

    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload).toMatchObject({ kind: 'repo', message: 'IDB delete failed' });
  });
});
