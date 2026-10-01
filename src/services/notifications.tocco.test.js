// @vitest-environment node
//
// The tap of a page timer's notification, decision 10 A of STATO_CORRENTE.md
// (2026-10-01): the timers stay next to the Web Push channel, and a tap brings
// the window forward without navigating it, the rule of public/sw-push.js.
// Pinned in both directions, one variable at a time.
//
// Node and not jsdom: jsdom's window.location cannot be replaced, and a
// navigation it does not implement leaves the address as it was, so a test
// there would stay green on a tap that navigates. Here window is a plain
// object whose address the test reads back.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotificationsService } from './notifications.js';

const INDIRIZZO = 'https://pt.esempio/pharmatimer/config';
let finestra;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-27T12:00:00'));
  finestra = { focus: vi.fn(), location: { href: INDIRIZZO } };
  globalThis.window = finestra;
  const Notifica = vi.fn(function (titolo, opzioni) {
    this.title = titolo;
    this.tag = opzioni && opzioni.tag;
    this.onclick = null;
  });
  Notifica.permission = 'granted';
  globalThis.Notification = Notifica;
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.window;
  delete globalThis.Notification;
});

function toccaLaNotifica() {
  const svc = createNotificationsService();
  svc.scheduleNotification({ entryKey: 'dose-7-1-2026-04-27', fireAt: Date.now() + 60_000, title: 't', body: 'b' });
  vi.advanceTimersByTime(60_000);
  const istanza = globalThis.Notification.mock.instances[0];
  istanza.onclick();
}

describe('il tocco di un timer di pagina (decisione 10 A)', () => {
  it('porta avanti la finestra', () => {
    toccaLaNotifica();
    expect(finestra.focus).toHaveBeenCalledTimes(1);
  });

  it('non naviga la finestra: puo avere un modulo non salvato', () => {
    toccaLaNotifica();
    expect(finestra.location.href).toBe(INDIRIZZO);
  });
});
