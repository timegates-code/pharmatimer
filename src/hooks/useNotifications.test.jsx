import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// 6 test sul decision tree 4 stati (AMB-9.F'). useApp() è mockato
// staticamente per ogni test via vi.mock('../state/AppContext').

vi.mock('../state/AppContext', () => ({
  useApp: vi.fn(),
}));

import { useApp } from '../state/AppContext';
import { useNotifications } from './useNotifications';

// Helper: builds mock context return value with controlled state/services/actions.
function makeMockApp({
  permission = 'granted',
  notifiche_attive = 0,
  isSupported = true,
  requestPermissionResult = 'granted',
  canale = undefined,
  setSettingResult = undefined,
} = {}) {
  const cancelAll = vi.fn();
  const requestPermission = vi.fn().mockResolvedValue(requestPermissionResult);
  const setSetting = vi.fn().mockResolvedValue(setSettingResult);
  const accendiCanale = vi.fn().mockResolvedValue(null);
  const spegniCanale = vi.fn().mockResolvedValue(null);
  const permesso = { valore: permission };
  const notifications = {
    isSupported: () => isSupported,
    getPermission: () => permesso.valore,
    requestPermission,
    cancelAll,
    scheduleNotification: vi.fn(),
    cancelNotification: vi.fn(),
    showDoseNotification: vi.fn(),
    getPendingCount: () => 0,
  };
  const services = canale === undefined ? { notifications } : { notifications, canale };
  useApp.mockReturnValue({
    state: { impostazioni: { notifiche_attive } },
    services,
    actions: { setSetting, accendiCanale, spegniCanale },
  });
  return { cancelAll, requestPermission, setSetting, accendiCanale, spegniCanale, notifications, permesso };
}

let originalMatchMedia;
let originalStandalone;

function setStandalone(value) {
  // Standalone simulation via matchMedia mock.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: value,
    media: '(display-mode: standalone)',
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  originalStandalone = window.navigator.standalone;
  delete window.navigator.standalone;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  if (originalStandalone !== undefined) {
    window.navigator.standalone = originalStandalone;
  }
  vi.clearAllMocks();
});

describe('useNotifications', () => {
  it('!isStandalone → enabled:false, requestEnable throws "not_standalone", disable noop', async () => {
    setStandalone(false);
    const { setSetting, cancelAll } = makeMockApp({
      permission: 'granted',
      notifiche_attive: 1,
    });
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.enabled).toBe(false);
    await expect(result.current.requestEnable()).rejects.toThrow('not_standalone');
    await act(async () => {
      await result.current.disable();
    });
    expect(setSetting).not.toHaveBeenCalled();
    expect(cancelAll).not.toHaveBeenCalled();
  });

  it('standalone + granted + notifiche_attive=1 → enabled:true', () => {
    setStandalone(true);
    makeMockApp({ permission: 'granted', notifiche_attive: 1 });
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isStandalone).toBe(true);
    expect(result.current.permission).toBe('granted');
    expect(result.current.enabled).toBe(true);
  });

  it('standalone + denied → enabled:false, requestEnable throws "permission_denied"', async () => {
    setStandalone(true);
    makeMockApp({ permission: 'denied', notifiche_attive: 0 });
    const { result } = renderHook(() => useNotifications());
    expect(result.current.enabled).toBe(false);
    expect(result.current.permission).toBe('denied');
    await expect(result.current.requestEnable()).rejects.toThrow('permission_denied');
  });

  it('standalone + default + requestEnable happy path → requestPermission + setSetting(1)', async () => {
    setStandalone(true);
    const { requestPermission, setSetting } = makeMockApp({
      permission: 'default',
      notifiche_attive: 0,
      requestPermissionResult: 'granted',
    });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.requestEnable();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 1);
  });

  it('disable → setSetting(0) + cancelAll', async () => {
    setStandalone(true);
    const { setSetting, cancelAll } = makeMockApp({
      permission: 'granted',
      notifiche_attive: 1,
    });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.disable();
    });
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 0);
    expect(cancelAll).toHaveBeenCalledTimes(1);
  });

  it('defensive revocation on mount: permission denied + notifiche_attive=1 → setSetting(0) + cancelAll', () => {
    setStandalone(true);
    const { setSetting, cancelAll } = makeMockApp({
      permission: 'denied',
      notifiche_attive: 1,
    });
    renderHook(() => useNotifications());
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 0);
    expect(cancelAll).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Client of the reminder channel, step 2 (STATO_CORRENTE.md, "Il commit B
// del client"). Ratification A of 2026-10-01: in API mode, with the
// preparation complete, subscribe() is the FIRST act of the toggle's tap and
// asks for the permission itself (S1). The service is a fake here; its own
// rules are pinned in services/canalePush.test.js.
// ============================================================

function creaCanale({ esitoGesto = { ok: true, iscrizione: { endpoint: 'https://x' } }, prepara = true } = {}) {
  return {
    prepara: vi.fn().mockResolvedValue(null),
    iscriviNelGesto: vi.fn(() => (prepara ? Promise.resolve(esitoGesto) : null)),
  };
}

describe('useNotifications -- il canale dei promemoria ad app chiusa', () => {
  it('all ingresso nella sezione il canale si prepara', () => {
    setStandalone(true);
    const canale = creaCanale();
    makeMockApp({ permission: 'granted', notifiche_attive: 0, canale });
    renderHook(() => useNotifications());
    expect(canale.prepara).toHaveBeenCalledTimes(1);
  });

  it('subscribe e il primo atto del tocco: prima di ogni attesa, e senza requestPermission', async () => {
    setStandalone(true);
    const esitoGesto = { ok: true, iscrizione: { endpoint: 'https://x' } };
    const canale = creaCanale({ esitoGesto });
    const { requestPermission, setSetting, accendiCanale, permesso } = makeMockApp({
      permission: 'default',
      notifiche_attive: 0,
      canale,
    });
    // The prompt that subscribe() opens is answered: granted.
    canale.iscriviNelGesto.mockImplementation(() => {
      permesso.valore = 'granted';
      return Promise.resolve(esitoGesto);
    });
    const { result } = renderHook(() => useNotifications());
    // No act() around the call: the assertion must see what happened BEFORE
    // any microtask runs, which is what "first act of the gesture" means.
    const promessa = result.current.requestEnable();
    expect(canale.iscriviNelGesto).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
    await act(async () => {
      await promessa;
    });
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 1);
    expect(accendiCanale).toHaveBeenCalledWith(esitoGesto);
  });

  it('senza preparazione il tocco fa cio che faceva: permesso e timer di pagina, e lo stato dice perche', async () => {
    setStandalone(true);
    const canale = creaCanale({ prepara: false });
    const { requestPermission, setSetting, accendiCanale } = makeMockApp({
      permission: 'default',
      notifiche_attive: 0,
      canale,
    });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.requestEnable();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 1);
    expect(accendiCanale).toHaveBeenCalledWith(null);
  });

  it('permesso negato al prompt del tocco: niente toggle e niente canale', async () => {
    setStandalone(true);
    const canale = creaCanale({ esitoGesto: { ok: false, errore: new Error('negato') } });
    const { setSetting, accendiCanale, permesso } = makeMockApp({
      permission: 'default',
      notifiche_attive: 0,
      canale,
    });
    canale.iscriviNelGesto.mockImplementation(() => {
      permesso.valore = 'denied';
      return Promise.resolve({ ok: false, errore: new Error('negato') });
    });
    const { result } = renderHook(() => useNotifications());
    await expect(result.current.requestEnable()).rejects.toThrow('permission_denied');
    expect(setSetting).not.toHaveBeenCalled();
    expect(accendiCanale).not.toHaveBeenCalled();
  });

  it('il toggle che non resta acceso porta via la subscription appena fatta', async () => {
    setStandalone(true);
    const canale = creaCanale();
    const { accendiCanale, spegniCanale } = makeMockApp({
      permission: 'granted',
      notifiche_attive: 0,
      canale,
      setSettingResult: { ok: false },
    });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.requestEnable();
    });
    expect(spegniCanale).toHaveBeenCalledTimes(1);
    expect(accendiCanale).not.toHaveBeenCalled();
  });

  it('toggle spento: anche il canale si spegne', async () => {
    setStandalone(true);
    const { setSetting, cancelAll, spegniCanale } = makeMockApp({
      permission: 'granted',
      notifiche_attive: 1,
      canale: creaCanale(),
    });
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.disable();
    });
    expect(setSetting).toHaveBeenCalledWith('notifiche_attive', 0);
    expect(cancelAll).toHaveBeenCalledTimes(1);
    expect(spegniCanale).toHaveBeenCalledTimes(1);
  });

  it('permesso revocato: anche il canale si spegne', () => {
    setStandalone(true);
    const { spegniCanale } = makeMockApp({
      permission: 'denied',
      notifiche_attive: 1,
      canale: creaCanale(),
    });
    renderHook(() => useNotifications());
    expect(spegniCanale).toHaveBeenCalledTimes(1);
  });
});
