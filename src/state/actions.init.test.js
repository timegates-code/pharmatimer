// @vitest-environment node
// ============================================================
// actions.init() — presoStack rehydration tests.
// ============================================================
//
// Scope Sessione 7d-2 CP3 (§6.40 / AMB-7d-2.C):
//   (1) Empty case: no 'presa' logs today → SET_PRESO_STACK with [].
//   (2) Ordering: two 'presa' logs today (08:00, 12:00) → stack
//       ['<key@08:00>', '<key@12:00>']; top = last (LIFO).
//   (3) Day isolation: logs of another day must NOT enter the stack.
//
// Strategy: stub repo methods with vi.fn, invoke createActions().init()
// directly, capture dispatched actions, assert the SET_PRESO_STACK
// dispatch exists with the expected payload.
//
// Environment: node — no DOM needed; createActions is pure JS.

import { describe, it, expect, vi } from 'vitest';
import { createActions } from './actions.js';

// Minimal viable seed shared across tests.
const PROFILO_ATTIVO = {
  id: 1,
  nome_profilo: 'Test',
  ora_sveglia: '07:00',
  ora_colazione: '08:00',
  ora_pranzo: '13:00',
  ora_cena: '20:00',
  ora_sonno: '23:00',
  attivo: 1,
};

const FARMACO = {
  id: 10,
  nome: 'TestMed',
  tipo_frequenza: 'fisso',
  intervallo_ore: null,
  intervallo_minimo_ore: null,
  dosi_giornaliere: 2,
  relazione_pasto: 'indifferente',
  data_inizio: '2020-01-01',
  data_fine: null,
  attivo: 1,
};

const ORARI = [
  { id: 1, farmaco_id: 10, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'colazione' },
  { id: 2, farmaco_id: 10, dose_numero: 2, offset_minuti: 0, ancora_riferimento: 'pranzo' },
];

/**
 * Build a fake repo with fully configurable getLogByDataStato per-test.
 * Other methods return sensible empty defaults so init()'s Promise.all
 * and getLogByRange resolve without touching the domain layer.
 */
function makeRepo(presaLogs = []) {
  return {
    getProfili: vi.fn().mockResolvedValue([PROFILO_ATTIVO]),
    getFarmaci: vi.fn().mockResolvedValue([FARMACO]),
    getAllOrari: vi.fn().mockResolvedValue(ORARI),
    getAllSettings: vi.fn().mockResolvedValue({}),
    getLogByRange: vi.fn().mockResolvedValue([]),
    // Return whatever the test configured; the method signature is
    // (data, stato) but init() only ever calls it with (today, 'presa').
    getLogByDataStato: vi.fn().mockResolvedValue(presaLogs),
  };
}

/**
 * Drive an init() cycle and return the list of dispatched actions in order.
 * getState returns a stable minimal shape sufficient for selectToday + init's
 * reads; no mutation across calls is needed for these tests.
 */
async function runInit({ repo, today }) {
  const dispatched = [];
  const dispatch = (a) => dispatched.push(a);
  const getState = () => ({
    simulatedNow: null,
    // selectToday uses resolveNow which in turn uses real Date; we override
    // via simulatedNow to make the test deterministic on `today`.
  });

  // Trick: selectToday → resolveNow({simulatedNow}) picks real date when
  // simulatedNow is null. To force a stable `today`, we instead inject
  // simulatedNow='HH:MM' which only affects the time, not the date.
  // Cleaner approach: override Date directly via vi.useFakeTimers.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${today}T10:30:00`));

  const actions = createActions({ dispatch, getState, repo });
  await actions.init();

  vi.useRealTimers();
  return dispatched;
}

describe('actions.init() — presoStack rehydration (Sessione 7d-2 CP3)', () => {
  it('dispatches SET_PRESO_STACK with [] when there are no presa logs today', async () => {
    const repo = makeRepo([]);

    const dispatched = await runInit({ repo, today: '2026-04-21' });

    // getLogByDataStato called exactly once, with (today, 'presa').
    expect(repo.getLogByDataStato).toHaveBeenCalledTimes(1);
    expect(repo.getLogByDataStato).toHaveBeenCalledWith('2026-04-21', 'presa');

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction).toBeDefined();
    expect(setStackAction.payload).toEqual([]);

    // Ordering sanity: SET_PRESO_STACK comes after INIT_SUCCESS.
    const idxSuccess = dispatched.findIndex((a) => a.type === 'INIT_SUCCESS');
    const idxStack = dispatched.findIndex((a) => a.type === 'SET_PRESO_STACK');
    expect(idxSuccess).toBeGreaterThan(-1);
    expect(idxStack).toBeGreaterThan(idxSuccess);
  });

  it('builds stack in ASC-by-ora_effettiva order (LIFO top = most recent)', async () => {
    // Two presa logs today — repo layer already returns them sorted ASC
    // (see LocalRepository.getLogByDataStato). The thunk trusts that order.
    const presaLogs = [
      {
        id: 1,
        farmaco_id: 10,
        data: '2026-04-21',
        dose_numero: 1,
        ora_prevista: '08:00',
        ora_effettiva: '08:00',
        stato: 'presa',
      },
      {
        id: 2,
        farmaco_id: 10,
        data: '2026-04-21',
        dose_numero: 2,
        ora_prevista: '12:00',
        ora_effettiva: '12:00',
        stato: 'presa',
      },
    ];
    const repo = makeRepo(presaLogs);

    const dispatched = await runInit({ repo, today: '2026-04-21' });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction).toBeDefined();
    expect(setStackAction.payload).toEqual([
      '2026-04-21-10-1',
      '2026-04-21-10-2',
    ]);

    // LIFO semantics: top = last element = most recent press (12:00).
    const top = setStackAction.payload.at(-1);
    expect(top).toBe('2026-04-21-10-2');
  });

  it('excludes logs of a different day (repo returns only today, thunk preserves that)', async () => {
    // This test guards the *contract boundary*: init() must not pass a
    // stale `today` to the repo, and must not massage the repo's
    // already-filtered output. We feed the repo a today=2026-04-21
    // scenario where only the 08:00 log came back (the repo itself
    // excluded yesterday's entry), and assert the stack contains only
    // today's key.
    const presaLogsTodayOnly = [
      {
        id: 1,
        farmaco_id: 10,
        data: '2026-04-21',
        dose_numero: 1,
        ora_prevista: '08:00',
        ora_effettiva: '08:00',
        stato: 'presa',
      },
    ];
    const repo = makeRepo(presaLogsTodayOnly);

    const dispatched = await runInit({ repo, today: '2026-04-21' });

    // The thunk MUST have asked for today ('2026-04-21'), not yesterday
    // or any other date.
    expect(repo.getLogByDataStato).toHaveBeenCalledWith('2026-04-21', 'presa');

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual(['2026-04-21-10-1']);
    // Crucially: no '2026-04-20-*' key ever made it into the payload.
    expect(
      setStackAction.payload.some((k) => k.startsWith('2026-04-20'))
    ).toBe(false);
  });
});
