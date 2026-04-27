import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotificationsService, rescheduleAllNotifications } from './notifications';

// 10 test su API singleton + 5 nuovi (CP4 §6.131) per rescheduleAllNotifications
// fix §6.127/§6.128. Pattern mock replicato da services/audio.js (Sessione 7b-1):
//  - globalThis.Notification mock class con permission='granted' + requestPermission vi.fn
//  - vi.useFakeTimers()
//  - cleanup afterEach (restore Notification + useRealTimers)
//
// Nota CP4: il blocco "rescheduleAllNotifications" testa la pure function
// con stato sintetico; il wiring React (8 trigger AMB-9.G') è testato in
// AppContext.test.jsx (integration).

let MockNotification;
let originalNotification;

beforeEach(() => {
  vi.useFakeTimers();
  // Mock constructor: spy on calls + capture instance for onclick assertion if needed.
  MockNotification = vi.fn(function (title, opts) {
    this.title = title;
    this.body = opts && opts.body;
    this.tag = opts && opts.tag;
    this.onclick = null;
  });
  MockNotification.permission = 'granted';
  MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
  originalNotification = globalThis.Notification;
  globalThis.Notification = MockNotification;
});

afterEach(() => {
  vi.useRealTimers();
  if (originalNotification === undefined) {
    delete globalThis.Notification;
  } else {
    globalThis.Notification = originalNotification;
  }
});

describe('notifications service', () => {
  it('schedule fires Notification constructor with title/body/tag after delay', () => {
    const svc = createNotificationsService();
    const fireAt = Date.now() + 5 * 60 * 1000;
    svc.scheduleNotification({ entryKey: 'k1', fireAt, title: 'Test', body: 'Body' });
    expect(svc.getPendingCount()).toBe(1);
    expect(MockNotification).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(MockNotification).toHaveBeenCalledTimes(1);
    expect(MockNotification).toHaveBeenCalledWith('Test', { body: 'Body', tag: 'k1' });
    expect(svc.getPendingCount()).toBe(0);
  });

  it('cancelNotification clears timer and removes from pending Map', () => {
    const svc = createNotificationsService();
    svc.scheduleNotification({ entryKey: 'k1', fireAt: Date.now() + 60_000, title: 't', body: 'b' });
    expect(svc.getPendingCount()).toBe(1);
    svc.cancelNotification('k1');
    expect(svc.getPendingCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('cancelAll clears all pending timers, no leak', () => {
    const svc = createNotificationsService();
    svc.scheduleNotification({ entryKey: 'k1', fireAt: Date.now() + 60_000, title: 't', body: 'b' });
    svc.scheduleNotification({ entryKey: 'k2', fireAt: Date.now() + 120_000, title: 't', body: 'b' });
    svc.scheduleNotification({ entryKey: 'k3', fireAt: Date.now() + 180_000, title: 't', body: 'b' });
    expect(svc.getPendingCount()).toBe(3);
    svc.cancelAll();
    expect(svc.getPendingCount()).toBe(0);
    vi.advanceTimersByTime(200_000);
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('isSupported reflects Notification global presence', () => {
    const svc = createNotificationsService();
    expect(svc.isSupported()).toBe(true);
    delete globalThis.Notification;
    expect(svc.isSupported()).toBe(false);
  });

  it('getPermission reflects Notification.permission', () => {
    const svc = createNotificationsService();
    MockNotification.permission = 'granted';
    expect(svc.getPermission()).toBe('granted');
    MockNotification.permission = 'denied';
    expect(svc.getPermission()).toBe('denied');
    MockNotification.permission = 'default';
    expect(svc.getPermission()).toBe('default');
  });

  it('requestPermission delegates to Notification.requestPermission', async () => {
    const svc = createNotificationsService();
    const result = await svc.requestPermission();
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(result).toBe('granted');
  });

  it('scheduleNotification with fireAt in the past is silent no-op (Q-CP2.3=A)', () => {
    const svc = createNotificationsService();
    svc.scheduleNotification({ entryKey: 'k1', fireAt: Date.now() - 1000, title: 't', body: 'b' });
    expect(svc.getPendingCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('tag-based replacement: rescheduling same entryKey cancels previous timer', () => {
    const svc = createNotificationsService();
    const t0 = Date.now();
    svc.scheduleNotification({ entryKey: 'k1', fireAt: t0 + 5 * 60_000, title: 'first', body: 'b1' });
    svc.scheduleNotification({ entryKey: 'k1', fireAt: t0 + 10 * 60_000, title: 'second', body: 'b2' });
    expect(svc.getPendingCount()).toBe(1);
    vi.advanceTimersByTime(11 * 60_000);
    // Solo la 2° schedule deve aver fired (la 1° è stata cancellata).
    expect(MockNotification).toHaveBeenCalledTimes(1);
    expect(MockNotification).toHaveBeenCalledWith('second', { body: 'b2', tag: 'k1' });
  });

  it('showDoseNotification builds dose-tag and uses formatRelazionePastoCopy body', () => {
    const svc = createNotificationsService();
    const t0 = Date.now();
    const fireAt = t0 + 30 * 60_000;
    const dateStr = new Date(fireAt).toISOString().slice(0, 10);
    const hh = String(new Date(fireAt).getHours()).padStart(2, '0');
    const mm = String(new Date(fireAt).getMinutes()).padStart(2, '0');
    const entry = {
      farmaco_id: 7,
      dose_numero: 2,
      dateStr,
      ora_prevista: `${hh}:${mm}`,
      ora_ricalcolata: null,
      stato: 'prevista',
    };
    const farmaco = {
      id: 7,
      nome: 'Pantorc 40mg',
      relazione_pasto: 'prima',
      dettaglio_pasto: '30 min prima colazione',
    };
    svc.showDoseNotification(entry, farmaco);
    expect(svc.getPendingCount()).toBe(1);
    vi.advanceTimersByTime(30 * 60_000);
    expect(MockNotification).toHaveBeenCalledTimes(1);
    expect(MockNotification).toHaveBeenCalledWith('Pantorc 40mg', {
      body: '30 min prima colazione',
      tag: `dose-7-2-${dateStr}`,
    });
  });

  it('showDoseNotification with indifferente+null farmaco uses fallback "Promemoria farmaco" body', () => {
    const svc = createNotificationsService();
    const t0 = Date.now();
    const fireAt = t0 + 30 * 60_000;
    const dateStr = new Date(fireAt).toISOString().slice(0, 10);
    const hh = String(new Date(fireAt).getHours()).padStart(2, '0');
    const mm = String(new Date(fireAt).getMinutes()).padStart(2, '0');
    const entry = {
      farmaco_id: 11,
      dose_numero: 1,
      dateStr,
      ora_prevista: `${hh}:${mm}`,
      ora_ricalcolata: null,
      stato: 'prevista',
    };
    const farmaco = {
      id: 11,
      nome: 'Levotuss 10ml',
      relazione_pasto: 'indifferente',
      dettaglio_pasto: null,
    };
    svc.showDoseNotification(entry, farmaco);
    vi.advanceTimersByTime(30 * 60_000);
    expect(MockNotification).toHaveBeenCalledWith('Levotuss 10ml', {
      body: 'Promemoria farmaco',
      tag: `dose-11-1-${dateStr}`,
    });
  });
});

// ============================================================
// CP4 §6.131 — rescheduleAllNotifications pure function tests.
// Validano i fix §6.127 (selectEntriesForDay vs state.pianoOggi) e
// §6.128 (selectFarmacoById vs state.farmaci[id] dict access).
// State sintetico minimale: solo i campi richiesti dai 3 selettori
// usati dalla funzione (selectToday, selectEntriesForDay,
// selectFarmacoById) + impostazioni placeholder.
// vi.setSystemTime fissa today='2026-04-27' per stabilità.
// ============================================================

function makeMockState({ today = '2026-04-27', plan = [], farmaci = [] } = {}) {
  return {
    status: 'ready',
    plan,
    farmaci,
    impostazioni: { notifiche_attive: 1 },
    simulatedNow: null,
    profiloAttivo: null,
    profili: [],
    orari: [],
    presoStack: [],
    error: null,
    lastBuiltForDay: today,
    prompt: null,
  };
}

function makeServiceMock() {
  return {
    cancelAll: vi.fn(),
    showDoseNotification: vi.fn(),
    isSupported: () => true,
    getPermission: () => 'granted',
  };
}

describe('rescheduleAllNotifications — CP4 fix §6.127 + §6.128', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-27T08:00:00'));
  });

  it('§6.127: legge da state.plan via selectEntriesForDay (today filter)', () => {
    const state = makeMockState({
      today: '2026-04-27',
      plan: [
        { dateStr: '2026-04-27', stato: 'prevista', farmaco_id: 1, dose_numero: 1, ora_prevista: '12:00' },
        { dateStr: '2026-04-26', stato: 'prevista', farmaco_id: 1, dose_numero: 1, ora_prevista: '12:00' }, // ieri, skip
        { dateStr: '2026-04-28', stato: 'prevista', farmaco_id: 1, dose_numero: 1, ora_prevista: '12:00' }, // domani, skip
      ],
      farmaci: [{ id: 1, nome: 'Test1', relazione_pasto: 'durante' }],
    });
    const service = makeServiceMock();
    rescheduleAllNotifications(state, service);
    expect(service.cancelAll).toHaveBeenCalledTimes(1);
    expect(service.showDoseNotification).toHaveBeenCalledTimes(1);
    const callArgs = service.showDoseNotification.mock.calls[0];
    expect(callArgs[0].dateStr).toBe('2026-04-27');
  });

  it('§6.128: legge state.farmaci come array (non come dict)', () => {
    const state = makeMockState({
      today: '2026-04-27',
      plan: [
        { dateStr: '2026-04-27', stato: 'prevista', farmaco_id: 42, dose_numero: 1, ora_prevista: '12:00' },
      ],
      // Array, NON dict. Pre-fix `farmaci[42]` avrebbe restituito undefined.
      farmaci: [
        { id: 1, nome: 'Wrong' },
        { id: 42, nome: 'Correct' },
        { id: 99, nome: 'Wrong2' },
      ],
    });
    const service = makeServiceMock();
    rescheduleAllNotifications(state, service);
    expect(service.showDoseNotification).toHaveBeenCalledTimes(1);
    const farmacoArg = service.showDoseNotification.mock.calls[0][1];
    expect(farmacoArg.id).toBe(42);
    expect(farmacoArg.nome).toBe('Correct');
  });

  it('skippa entries con stato non in {prevista,ricalcolata}', () => {
    const state = makeMockState({
      today: '2026-04-27',
      plan: [
        { dateStr: '2026-04-27', stato: 'presa', farmaco_id: 1, dose_numero: 1, ora_prevista: '08:00' },
        { dateStr: '2026-04-27', stato: 'saltata', farmaco_id: 1, dose_numero: 2, ora_prevista: '14:00' },
        { dateStr: '2026-04-27', stato: 'sospesa', farmaco_id: 1, dose_numero: 3, ora_prevista: '20:00' },
        { dateStr: '2026-04-27', stato: 'prevista', farmaco_id: 1, dose_numero: 4, ora_prevista: '22:00' },
        { dateStr: '2026-04-27', stato: 'ricalcolata', farmaco_id: 1, dose_numero: 5, ora_prevista: '23:00', ora_ricalcolata: '2026-04-27T23:30' },
      ],
      farmaci: [{ id: 1, nome: 'Test', relazione_pasto: 'indifferente' }],
    });
    const service = makeServiceMock();
    rescheduleAllNotifications(state, service);
    // Solo 'prevista' (dose 4) e 'ricalcolata' (dose 5) → 2 chiamate
    expect(service.showDoseNotification).toHaveBeenCalledTimes(2);
  });

  it('skippa entries il cui farmaco_id non risolve in state.farmaci', () => {
    const state = makeMockState({
      today: '2026-04-27',
      plan: [
        { dateStr: '2026-04-27', stato: 'prevista', farmaco_id: 999, dose_numero: 1, ora_prevista: '12:00' },
      ],
      farmaci: [{ id: 1, nome: 'Other' }],
    });
    const service = makeServiceMock();
    rescheduleAllNotifications(state, service);
    expect(service.cancelAll).toHaveBeenCalledTimes(1);
    expect(service.showDoseNotification).toHaveBeenCalledTimes(0);
  });

  it('integration: createNotificationsService + reschedule produce un timer pendente', () => {
    const state = makeMockState({
      today: '2026-04-27',
      plan: [
        { dateStr: '2026-04-27', stato: 'prevista', farmaco_id: 1, dose_numero: 1, ora_prevista: '23:30' },
      ],
      farmaci: [{ id: 1, nome: 'Test', relazione_pasto: 'durante' }],
    });
    const service = createNotificationsService();
    rescheduleAllNotifications(state, service);
    expect(service.getPendingCount()).toBe(1);
  });
});
