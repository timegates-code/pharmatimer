// @vitest-environment node
// ============================================================
// actions.scheduleTestDose — thunk tests (Sessione 9-B parte 5/5 CP1, §6.142).
// ============================================================
//
// Scope (3 scenarios):
//   (1) happy path: state ready + 1 farmaco → SET_PLAN dispatched
//       with synthetic entry (canonical shape post-§6.138, dose_numero=999),
//       services.notifications.showDoseNotification called with that entry.
//   (2) NOT_READY: state.status !== 'ready' → throws, no dispatch,
//       no reschedule call.
//   (3) NO_FARMACI: state.status === 'ready' but state.farmaci === []
//       → throws, no dispatch, no reschedule call.
//
// Pattern: vi.fn services injection + createActions closure + dispatched[]
// capture, mirroring actions.profili.test.js / actions.farmaci.test.js.
// vi.useFakeTimers locks Date.now() so ora_prevista assertion is deterministic.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActions } from './actions.js';

const F1 = { id: 10, nome: 'Aspirina' };
const P_ATTIVO = {
  id: 1, nome_profilo: 'Standard',
  ora_sveglia: '07:00', ora_colazione: '07:30',
  ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
  attivo: 1,
};

function makeNotificationsMock() {
  return {
    isSupported: vi.fn(() => true),
    getPermission: vi.fn(() => 'granted'),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    scheduleNotification: vi.fn(),
    cancelNotification: vi.fn(),
    cancelAll: vi.fn(),
    showDoseNotification: vi.fn(),
    getPendingCount: vi.fn(() => 0),
  };
}

function makeDeps({ stateOverrides = {}, repoOverrides = {} } = {}) {
  const dispatched = [];
  // Mutable closure over `state` so SET_PLAN dispatch updates the
  // snapshot read by the subsequent rescheduleAllNotifications call
  // (mirrors AppContext stateRef behaviour for synchronous flows).
  const state = {
    status: 'ready',
    impostazioni: { notifiche_attive: 1 },
    profili: [P_ATTIVO],
    profiloAttivo: P_ATTIVO,
    farmaci: [F1],
    orari: [],
    plan: [],
    presoStack: [],
    error: null,
    simulatedNow: null,
    lastBuiltForDay: null,
    ...stateOverrides,
  };
  const dispatch = (a) => {
    dispatched.push(a);
    if (a.type === 'SET_PLAN') {
      state.plan = a.payload;
    }
  };
  const getState = () => state;
  const repo = { ...repoOverrides };
  const services = { notifications: makeNotificationsMock() };
  return { dispatched, dispatch, getState, repo, services, state };
}

describe('actions.scheduleTestDose', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Local date constructor (year, monthIdx, day, hh, mm, ss) — timezone-safe.
    vi.setSystemTime(new Date(2026, 3, 28, 18, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('(1) happy path: dispatcha SET_PLAN con entry sintetica + chiama showDoseNotification', async () => {
    const { dispatched, dispatch, getState, repo, services } = makeDeps();
    const actions = createActions({ dispatch, getState, repo, services });

    const result = await actions.scheduleTestDose(5);

    expect(result).toEqual({ ok: true, ora_prevista: '18:05', farmacoId: 10 });

    // SET_PLAN dispatched with synthetic entry appended.
    const setPlan = dispatched.find((a) => a.type === 'SET_PLAN');
    expect(setPlan).toBeDefined();
    expect(setPlan.payload).toHaveLength(1);
    const entry = setPlan.payload[0];

    // dateStr is whatever selectToday produces with fake-timed clock —
    // assert canonical shape, not exact value (selectors.js is the SoT).
    expect(entry.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // §6.138 canonical shape: farmaco_id + dose_numero nested under orario.
    expect(entry).toMatchObject({
      orario: { farmaco_id: 10, dose_numero: 999, offset_minuti: 0 },
      ora_prevista: '18:05',
      ora_ricalcolata: null,
      stato: 'prevista',
    });
    expect(entry.farmaco).toBe(F1);

    // rescheduleAllNotifications invoked exactly once
    // (cancelAll + showDoseNotification per matching entry).
    expect(services.notifications.cancelAll).toHaveBeenCalledTimes(1);
    expect(services.notifications.showDoseNotification).toHaveBeenCalledTimes(1);
    const [notifEntry, notifFarmaco] =
      services.notifications.showDoseNotification.mock.calls[0];
    expect(notifEntry).toBe(entry);
    expect(notifFarmaco).toBe(F1);
  });

  it('(2) NOT_READY: lancia NOT_READY, nessun dispatch, nessuna reschedule', async () => {
    const { dispatched, dispatch, getState, repo, services } = makeDeps({
      stateOverrides: { status: 'idle' },
    });
    const actions = createActions({ dispatch, getState, repo, services });

    await expect(actions.scheduleTestDose(5)).rejects.toThrow('NOT_READY');
    expect(dispatched).toHaveLength(0);
    expect(services.notifications.cancelAll).not.toHaveBeenCalled();
    expect(services.notifications.showDoseNotification).not.toHaveBeenCalled();
  });

  it('(3) NO_FARMACI: stato ready ma farmaci vuoto, lancia NO_FARMACI', async () => {
    const { dispatched, dispatch, getState, repo, services } = makeDeps({
      stateOverrides: { farmaci: [] },
    });
    const actions = createActions({ dispatch, getState, repo, services });

    await expect(actions.scheduleTestDose(5)).rejects.toThrow('NO_FARMACI');
    expect(dispatched).toHaveLength(0);
    expect(services.notifications.cancelAll).not.toHaveBeenCalled();
  });
});
