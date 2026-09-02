// @vitest-environment node
// ============================================================
// DST nelle notifiche (decisione 1): la notifica suona allo ISTANTE della
// dose, e lo istante passa dalla porta wallToInstant. Ogni test asserisce
// un fatto falso senza ora legale (`make controllo-dst`).
// Mock di Notification e timer finti come in notifications.test.js.
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotificationsService } from './notifications.js';

let originalNotification;

beforeEach(() => {
  vi.useFakeTimers();
  const MockNotification = vi.fn(function (title, opts) {
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

const farmaco = { id: 7, nome: 'Test', relazione_pasto: 'indifferente' };
const entry = (dateStr, ora_prevista, ora_ricalcolata = null) => ({
  dateStr,
  ora_prevista,
  ora_ricalcolata,
  orario: { dose_numero: 1 },
});

const MINUTO = 60_000;

describe('showDoseNotification e le due ore del calendario civile', () => {
  it('29 marzo, dose alle 02:30: suona al primo istante esistente, 01:00Z (03:00 CEST), non alle 03:30', () => {
    vi.setSystemTime(new Date('2026-03-29T00:00:00Z'));
    const svc = createNotificationsService();
    svc.showDoseNotification(entry('2026-03-29', '02:30'), farmaco);
    expect(svc.getPendingCount()).toBe(1);
    vi.advanceTimersByTime(60 * MINUTO - 1000);
    expect(globalThis.Notification).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(globalThis.Notification).toHaveBeenCalledTimes(1);
  });

  it('25 ottobre, ricalcolata alle 02:30: suona alla PRIMA occorrenza, 00:30Z, non alla seconda', () => {
    vi.setSystemTime(new Date('2026-10-24T23:00:00Z'));
    const svc = createNotificationsService();
    svc.showDoseNotification(entry('2026-10-25', '01:00', '2026-10-25T02:30'), farmaco);
    expect(svc.getPendingCount()).toBe(1);
    vi.advanceTimersByTime(90 * MINUTO - 1000);
    expect(globalThis.Notification).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(globalThis.Notification).toHaveBeenCalledTimes(1);
  });
});
