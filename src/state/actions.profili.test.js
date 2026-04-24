// @vitest-environment node
// ============================================================
// actions.addProfilo / updateProfilo — thunk tests (Sessione 8b CP3 / AMB-8b.D/E).
// ============================================================
//
// Scope (3 scenarios):
//   (1) addProfilo success: repo.addProfilo called with attivo:0,
//       SET_PROFILI dispatched with [...old, {...data, id, attivo:0}],
//       return {ok:true, id}.
//   (2) addProfilo repo error: SET_ERROR kind:'repo' dispatched,
//       no SET_PROFILI, return {ok:false}.
//   (3) updateProfilo on active profile: AMB-8b.E guard strips
//       `attivo` from patch; SET_PROFILI + SET_PROFILO_ATTIVO
//       dispatched; rebuildPlan invoked (§6.64).
//
// CP6 Sessione 8d-A-continue addition:
//   (7) updateProfilo coherence (§6.95 preventive retrofit / §6.102):
//       on active profilo, buildMultiDayPlan receives the FRESH
//       profilo (merged with patch) rather than the stale stateRef
//       snapshot that `rebuildPlan()` would have read.
//
// Pattern: vi.fn repo + createActions closure + dispatched[] capture,
// mirroring actions.init.test.js / actions.annullaAssunzione.test.js.

import { describe, it, expect, vi } from 'vitest';

// §6.102 / CP6: mock planBuilder to expose an observable spy on
// buildMultiDayPlan. Default return [] is safe for existing tests
// (1)-(6) which never assert on plan content — they only check
// dispatch types, repo calls, and state transitions.
vi.mock('../domain/planBuilder.js', () => ({
  buildMultiDayPlan: vi.fn(() => []),
}));

import { createActions } from './actions.js';
import { buildMultiDayPlan } from '../domain/planBuilder.js';

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
    simulatedNow: null,
    ...stateOverrides,
  };
  const getState = () => state;

  const repo = {
    addProfilo: vi.fn().mockResolvedValue(42),
    updateProfilo: vi.fn().mockResolvedValue(undefined),
    getLogByRange: vi.fn().mockResolvedValue([]),
    ...repoOverrides,
  };

  return { dispatched, dispatch, getState, repo };
}

describe('actions.addProfilo', () => {
  it('(1) success: inserisce con attivo:0, dispatcha SET_PROFILI, ritorna {ok, id}', async () => {
    const { dispatched, dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addProfilo({
      nome_profilo: 'Weekend',
      ora_sveglia: '09:00',
      ora_colazione: '09:30',
      ora_pranzo: '13:00',
      ora_cena: '20:30',
      ora_sonno: '23:30',
    });

    expect(result).toEqual({ ok: true, id: 42 });
    expect(repo.addProfilo).toHaveBeenCalledTimes(1);
    // Repo payload includes attivo:0 forced by the thunk.
    expect(repo.addProfilo.mock.calls[0][0]).toMatchObject({
      nome_profilo: 'Weekend',
      attivo: 0,
    });
    // SET_PROFILI dispatched with the old array + new profilo.
    const setProfili = dispatched.find((a) => a.type === 'SET_PROFILI');
    expect(setProfili).toBeDefined();
    expect(setProfili.payload).toHaveLength(2);
    expect(setProfili.payload[1]).toMatchObject({
      id: 42, nome_profilo: 'Weekend', attivo: 0,
    });
    // No error dispatched.
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });

  it('(2) repo error: dispatcha SET_ERROR kind:repo, nessun SET_PROFILI, ritorna {ok:false}', async () => {
    const repoOverrides = {
      addProfilo: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({ repoOverrides });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.addProfilo({ nome_profilo: 'X' });

    expect(result).toEqual({ ok: false });
    expect(dispatched.find((a) => a.type === 'SET_PROFILI')).toBeUndefined();
    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload).toMatchObject({ kind: 'repo', message: 'DB write failed' });
  });
});

describe('actions.updateProfilo', () => {
  it('(3) su profilo attivo: filtra attivo dal patch, dispatcha SET_PROFILI + SET_PROFILO_ATTIVO, triggera rebuildPlan', async () => {
    const { dispatched, dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    // Patch con `attivo: 0` malizioso: AMB-8b.E deve strippare.
    const patch = {
      ora_colazione: '08:00',
      attivo: 0,
    };
    const result = await actions.updateProfilo(1, patch);

    expect(result).toEqual({ ok: true });

    // Repo ricevuto patch SENZA attivo (guard AMB-8b.E).
    expect(repo.updateProfilo).toHaveBeenCalledTimes(1);
    const [, safePatch] = repo.updateProfilo.mock.calls[0];
    expect(safePatch).toEqual({ ora_colazione: '08:00' });
    expect('attivo' in safePatch).toBe(false);

    // SET_PROFILI dispatched con profilo patchato.
    const setProfili = dispatched.find((a) => a.type === 'SET_PROFILI');
    expect(setProfili.payload[0]).toMatchObject({
      id: 1, ora_colazione: '08:00', attivo: 1,
    });

    // SET_PROFILO_ATTIVO dispatched (mirror sync).
    const setAttivo = dispatched.find((a) => a.type === 'SET_PROFILO_ATTIVO');
    expect(setAttivo).toBeDefined();
    expect(setAttivo.payload).toMatchObject({
      id: 1, ora_colazione: '08:00', attivo: 1,
    });

    // rebuildPlan triggered → repo.getLogByRange invoked (§6.64).
    expect(repo.getLogByRange).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// deleteProfilo — thunk tests (Sessione 8b CP4 / AMB-8b.D/F).
// ============================================================

describe('actions.deleteProfilo', () => {
  it('(4) success: dispatcha SET_PROFILI filtrato, ritorna {ok:true}', async () => {
    // Seed con 2 profili; cancelliamo id=2 (non attivo).
    const P2 = {
      id: 2, nome_profilo: 'Nottambulo',
      ora_sveglia: '10:00', ora_colazione: '10:30',
      ora_pranzo: '14:30', ora_cena: '21:30', ora_sonno: '02:00',
      attivo: 0,
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({
      stateOverrides: { profili: [P_ATTIVO, P2] },
      repoOverrides: {
        deleteProfilo: vi.fn().mockResolvedValue(undefined),
      },
    });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.deleteProfilo(2);

    expect(result).toEqual({ ok: true });
    expect(repo.deleteProfilo).toHaveBeenCalledWith(2);

    const setProfili = dispatched.find((a) => a.type === 'SET_PROFILI');
    expect(setProfili).toBeDefined();
    expect(setProfili.payload).toHaveLength(1);
    expect(setProfili.payload[0].id).toBe(1);
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });

  it('(5) error (repo guard §6.5 su profilo attivo): dispatcha SET_ERROR, no SET_PROFILI, ritorna {ok:false}', async () => {
    // Repo rejects per la guard §6.5 (canonical path: tentativo di delete
    // sul profilo attivo). Il thunk non ripete la guard, solo cattura.
    const { dispatched, dispatch, getState, repo } = makeDeps({
      repoOverrides: {
        deleteProfilo: vi.fn().mockRejectedValue(
          new Error('Non si può eliminare il profilo attivo. Attivane un altro prima.')
        ),
      },
    });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.deleteProfilo(1);

    expect(result).toEqual({ ok: false });
    expect(dispatched.find((a) => a.type === 'SET_PROFILI')).toBeUndefined();
    const err = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(err).toBeDefined();
    expect(err.payload.kind).toBe('repo');
    expect(err.payload.message).toMatch(/profilo attivo/i);
  });
});

// ============================================================
// attivaProfilo — wrapper test (Sessione 8b CP5 / AMB-8b.D/F3).
// ============================================================

describe('actions.attivaProfilo', () => {
  it('(6) happy path: risolve id via selectProfiloById e delega a cambiaProfilo (APPLY_CAMBIO_PROFILO dispatched)', async () => {
    // Seed: Standard attivo, Nottambulo non-attivo. Attiviamo Nottambulo (id=2).
    const P2 = {
      id: 2, nome_profilo: 'Nottambulo',
      ora_sveglia: '10:00', ora_colazione: '10:30',
      ora_pranzo: '14:30', ora_cena: '21:30', ora_sonno: '02:00',
      attivo: 0,
    };
    const { dispatched, dispatch, getState, repo } = makeDeps({
      stateOverrides: {
        profili: [P_ATTIVO, P2],
        plan: [],
      },
      repoOverrides: {
        setProfiloAttivoConCleanup: vi.fn().mockResolvedValue(undefined),
      },
    });
    const actions = createActions({ dispatch, getState, repo });

    const result = await actions.attivaProfilo(2);

    expect(result).toEqual({ ok: true });

    // cambiaProfilo ha scaricato APPLY_CAMBIO_PROFILO con profiloAttivo=P2 patchato.
    const apply = dispatched.find((a) => a.type === 'APPLY_CAMBIO_PROFILO');
    expect(apply).toBeDefined();
    expect(apply.payload.profiloAttivo).toMatchObject({ id: 2, attivo: 1 });
    // profili aggiornati: Standard attivo:0, Nottambulo attivo:1.
    const byId = Object.fromEntries(
      apply.payload.profili.map((p) => [p.id, p])
    );
    expect(byId[1].attivo).toBe(0);
    expect(byId[2].attivo).toBe(1);

    // Repo cleanup invoked.
    expect(repo.setProfiloAttivoConCleanup).toHaveBeenCalledWith(2, []);

    // Nessun SET_ERROR.
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });
});

// ============================================================
// CP6 Sessione 8d-A-continue — §6.95 preventive retrofit (§6.102).
// ============================================================

describe('actions.updateProfilo — rebuildPlan coherence (§6.95 / §6.102)', () => {
  it('(7) su profilo attivo: buildMultiDayPlan riceve profilo fresco (patched), non stateRef stale', async () => {
    // Clear the shared spy between suites so previous tests'
    // invocations don't pollute the assertion below.
    buildMultiDayPlan.mockClear();

    // getState() returns a stable reference to `state` that is never
    // mutated by dispatch — this simulates the real-world stateRef
    // lag (AppContext updates stateRef in a useEffect one tick AFTER
    // dispatch). Pre-§6.102, `await rebuildPlan()` would read
    // `state.profiloAttivo` with the OLD ora_colazione '07:30'.
    // Post-fix, `rebuildPlanFromFresh({ profilo: nuovo })` receives
    // the patched profilo directly.
    const { dispatched, dispatch, getState, repo } = makeDeps();
    const actions = createActions({ dispatch, getState, repo });

    // Patch ora_colazione '07:30' → '09:00' on the active profilo.
    const result = await actions.updateProfilo(1, { ora_colazione: '09:00' });
    expect(result).toEqual({ ok: true });

    // buildMultiDayPlan invoked (rebuildPlanFromFresh path).
    expect(buildMultiDayPlan).toHaveBeenCalled();

    // Last call received the FRESH profilo (ora_colazione '09:00'),
    // NOT the stale one from getState() (still '07:30').
    const lastCallArgs = buildMultiDayPlan.mock.calls.at(-1)[0];
    expect(lastCallArgs.profilo).toMatchObject({
      id: 1,
      ora_colazione: '09:00',
      attivo: 1,
    });
    // Cross-check: stateRef snapshot is still stale (test sanity).
    expect(getState().profiloAttivo.ora_colazione).toBe('07:30');

    // REBUILD_PLAN dispatched.
    expect(dispatched.find((a) => a.type === 'REBUILD_PLAN')).toBeDefined();
    // No error.
    expect(dispatched.find((a) => a.type === 'SET_ERROR')).toBeUndefined();
  });
});
