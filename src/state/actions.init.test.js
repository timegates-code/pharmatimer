// ============================================================
// actions.init() — presoStack rehydration tests.
// ============================================================
//
// Scope Sessione 8-pre (§6.72, supersedes §6.40 day-scoped):
//   Rehydration window extended to [today - PLAN_DAYS_BEFORE, today].
//   Source: logAssunzioni reused from init()'s getLogByRange call
//   (Changelog §6.75 reuse optimization, not a dedicated query).
//
// Test scope (6 scenarios):
//   (1) Empty window: no 'presa' logs → stack [].
//   (2) Today only: 1 'presa' today → stack [todayKey].
//   (3) Yesterday only: 1 'presa' yesterday → stack [yesterdayKey]
//       (cross-day UNDO affordance, §6.72 happy path).
//   (4) Yesterday + today: 3 logs → ASC ordering preserved, LIFO top
//       = most recent press (today 12:00).
//   (5) State filter: 'saltata' / 'ricalcolata' / 'sospesa' logs
//       excluded; only 'presa' enters the stack.
//   (6) Window right-bound: 'presa' dated tomorrow (within
//       logAssunzioni via PLAN_DAYS_AFTER) must NOT enter the stack.
//
// Strategy: stub repo methods with vi.fn, invoke createActions().init()
// directly, capture dispatched actions, assert SET_PRESO_STACK payload.
// Today is pinned to 2026-04-21 via vi.setSystemTime in beforeEach.
//
// Environment: node — no DOM needed; createActions is pure JS.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActions } from './actions.js';

const TODAY = '2026-04-21';
const YESTERDAY = '2026-04-20';
const TOMORROW = '2026-04-22';

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
 * Build a fake repo. getLogByRange returns the configured logs; init()
 * uses that array both for buildMultiDayPlan AND (§6.75) for presoStack
 * rehydration — the thunk no longer calls getLogByDataStato.
 */
function makeRepo(rangeLogs = []) {
  return {
    getProfili: vi.fn().mockResolvedValue([PROFILO_ATTIVO]),
    getFarmaci: vi.fn().mockResolvedValue([FARMACO]),
    getAllOrari: vi.fn().mockResolvedValue(ORARI),
    getAllSettings: vi.fn().mockResolvedValue({}),
    getLogByRange: vi.fn().mockResolvedValue(rangeLogs),
    // Kept as a spy to verify it is NO LONGER called after §6.75.
    getLogByDataStato: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Drive an init() cycle and return the list of dispatched actions.
 */
async function runInit({ repo }) {
  const dispatched = [];
  const dispatch = (a) => dispatched.push(a);
  const getState = () => ({ simulatedNow: null });

  const actions = createActions({ dispatch, getState, repo });
  await actions.init();
  return dispatched;
}

// Helper: a 'presa' log row with sensible defaults.
function presaLog({ id, data, dose_numero, ora }) {
  return {
    id,
    farmaco_id: 10,
    data,
    dose_numero,
    ora_prevista: ora,
    ora_effettiva: ora,
    stato: 'presa',
  };
}

describe('actions.init() — presoStack rehydration cross-day (Sessione 8-pre, §6.72 + §6.75)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T10:30:00`));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches SET_PRESO_STACK with [] when logAssunzioni is empty', async () => {
    const repo = makeRepo([]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction).toBeDefined();
    expect(setStackAction.payload).toEqual([]);

    // §6.75: getLogByDataStato is NO LONGER called by init().
    expect(repo.getLogByDataStato).not.toHaveBeenCalled();

    // Ordering: SET_PRESO_STACK dispatched after INIT_SUCCESS.
    const idxSuccess = dispatched.findIndex((a) => a.type === 'INIT_SUCCESS');
    const idxStack = dispatched.findIndex((a) => a.type === 'SET_PRESO_STACK');
    expect(idxSuccess).toBeGreaterThan(-1);
    expect(idxStack).toBeGreaterThan(idxSuccess);
  });

  it('rehydrates a single today presa into the stack', async () => {
    const repo = makeRepo([
      presaLog({ id: 1, data: TODAY, dose_numero: 1, ora: '08:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([`${TODAY}-10-1`]);
  });

  it('rehydrates a single yesterday presa into the stack (cross-day §6.72)', async () => {
    const repo = makeRepo([
      presaLog({ id: 1, data: YESTERDAY, dose_numero: 2, ora: '13:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([`${YESTERDAY}-10-2`]);
    // LIFO top = yesterday's press (only press in the window).
    expect(setStackAction.payload.at(-1)).toBe(`${YESTERDAY}-10-2`);
  });

  it('preserves ASC order across yesterday + today (LIFO top = most recent)', async () => {
    // Questo caso consegna un input GIA ordinato: verifica il
    // passaggio, non lo ordinamento. Il pin dello ordinamento e nei
    // due casi seguenti (SENTINEL_S2C1_PRESOSTACK_PIN).
    const repo = makeRepo([
      presaLog({ id: 1, data: YESTERDAY, dose_numero: 2, ora: '13:00' }),
      presaLog({ id: 2, data: TODAY, dose_numero: 1, ora: '08:00' }),
      presaLog({ id: 3, data: TODAY, dose_numero: 2, ora: '12:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([
      `${YESTERDAY}-10-2`,
      `${TODAY}-10-1`,
      `${TODAY}-10-2`,
    ]);
    expect(setStackAction.payload.at(-1)).toBe(`${TODAY}-10-2`);
  });

  // ==========================================================
  // Pin dello ordinamento esplicito di presoStack.
  // par.22.198-tretriginties / S2c-1 punto (k), Q-AUD-3 -> PC-3.
  // SENTINEL_S2C1_PRESOSTACK_PIN
  // ==========================================================

  it('ordina lo stack anche se il repo restituisce ordine NON cronologico', async () => {
    // NESSUN ramo del repository garantisce un ordine: la via API
    // restituisce arrays.flat() di un fan-out per farmaco (ordine
    // farmaco-major), lo specchio restituisce lo ordine dello indice
    // `data` con pareggi per id. Qui il repo consegna le righe
    // mescolate: lo stack deve uscire cronologico lo stesso, altrimenti
    // dopo un reload `annulla ultima` colpisce una dose diversa da
    // quella attesa -- dose realmente presa che torna "da prendere"
    // (M1) e record che diverge dallo intento (M3).
    const repo = makeRepo([
      presaLog({ id: 3, data: TODAY, dose_numero: 2, ora: '12:00' }),
      presaLog({ id: 1, data: YESTERDAY, dose_numero: 2, ora: '13:00' }),
      presaLog({ id: 2, data: TODAY, dose_numero: 1, ora: '08:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([
      `${YESTERDAY}-10-2`,
      `${TODAY}-10-1`,
      `${TODAY}-10-2`,
    ]);
    expect(setStackAction.payload.at(-1)).toBe(`${TODAY}-10-2`);
  });

  it('ordina correttamente con ora_effettiva di FORMATO MISTO (ISO piu HH:MM)', async () => {
    // Lo stesso istante clinico arriva in forme diverse secondo la via
    // di scrittura: ISO completo quando la riga viene dal server,
    // 'HH:MM' quando viene dal dominio locale. Un confronto
    // lessicografico crudo metterebbe '12:00' PRIMA di
    // '<data>T08:00:00' (perche '1' < '2'), cioe la presa piu recente
    // finirebbe in FONDO allo stack. Q3=A: la chiave temporale si
    // normalizza a 'HH:MM' prima del confronto.
    const repo = makeRepo([
      {
        id: 1,
        farmaco_id: 10,
        data: TODAY,
        dose_numero: 2,
        ora_prevista: '12:00',
        ora_effettiva: '12:00',
        stato: 'presa',
      },
      {
        id: 2,
        farmaco_id: 10,
        data: TODAY,
        dose_numero: 1,
        ora_prevista: '08:00',
        ora_effettiva: `${TODAY}T08:00:00`,
        stato: 'presa',
      },
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([
      `${TODAY}-10-1`,
      `${TODAY}-10-2`,
    ]);
    expect(setStackAction.payload.at(-1)).toBe(`${TODAY}-10-2`);
  });

  it('excludes non-presa logs from the stack (stato filter)', async () => {
    const repo = makeRepo([
      { id: 1, farmaco_id: 10, data: TODAY, dose_numero: 1,
        ora_prevista: '08:00', ora_effettiva: null, stato: 'saltata' },
      { id: 2, farmaco_id: 10, data: TODAY, dose_numero: 2,
        ora_prevista: '12:00', ora_effettiva: null, stato: 'ricalcolata',
        ora_ricalcolata: '13:00' },
      { id: 3, farmaco_id: 10, data: YESTERDAY, dose_numero: 1,
        ora_prevista: '08:00', ora_effettiva: null, stato: 'sospesa' },
      presaLog({ id: 4, data: TODAY, dose_numero: 1, ora: '08:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([`${TODAY}-10-1`]);
  });

  it('excludes presa logs dated after today (window right-bound guard)', async () => {
    // A presa dated tomorrow (theoretically impossible, defensive)
    // must NOT enter the stack even though logAssunzioni includes
    // days up to today + PLAN_DAYS_AFTER.
    const repo = makeRepo([
      presaLog({ id: 1, data: TODAY, dose_numero: 1, ora: '08:00' }),
      presaLog({ id: 2, data: TOMORROW, dose_numero: 1, ora: '08:00' }),
    ]);
    const dispatched = await runInit({ repo });

    const setStackAction = dispatched.find((a) => a.type === 'SET_PRESO_STACK');
    expect(setStackAction.payload).toEqual([`${TODAY}-10-1`]);
    expect(
      setStackAction.payload.some((k) => k.startsWith(TOMORROW))
    ).toBe(false);
  });
});

// SENTINEL_N5QC_CP4BIS_INIT_CODE_TEST -- drift-N53 (M1): il catch di init()
// deve PROPAGARE err.code (es. UNAUTHORIZED) in INIT_ERROR.payload.code, cosi
// SessionExpiryGate puo auto-clear un token stale al reload. Rami preesistenti
// NO_ACTIVE_PROFILE / INIT_FAILED preservati (verificati dai test sopra).
describe('actions.init() — propagazione err.code nel catch (CP4-bis drift-N53)', () => {
  it('propaga UNAUTHORIZED in INIT_ERROR.payload.code', async () => {
    const repo = makeRepo([]);
    const authErr = new Error('Token non valido');
    authErr.code = 'UNAUTHORIZED';
    repo.getProfili = vi.fn().mockRejectedValue(authErr);

    const dispatched = await runInit({ repo });

    const initError = dispatched.find((a) => a.type === 'INIT_ERROR');
    expect(initError).toBeDefined();
    expect(initError.payload.code).toBe('UNAUTHORIZED');
    expect(initError.payload.message).toBe('Token non valido');
  });

  it('ripiega su INIT_FAILED quando err non ha code', async () => {
    const repo = makeRepo([]);
    repo.getProfili = vi.fn().mockRejectedValue(new Error('boom generico'));

    const dispatched = await runInit({ repo });

    const initError = dispatched.find((a) => a.type === 'INIT_ERROR');
    expect(initError).toBeDefined();
    expect(initError.payload.code).toBe('INIT_FAILED');
  });
});
