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
} = {}) {
  const cancelAll = vi.fn();
  const requestPermission = vi.fn().mockResolvedValue(requestPermissionResult);
  const setSetting = vi.fn().mockResolvedValue(undefined);
  const notifications = {
    isSupported: () => isSupported,
    getPermission: () => permission,
    requestPermission,
    cancelAll,
    scheduleNotification: vi.fn(),
    cancelNotification: vi.fn(),
    showDoseNotification: vi.fn(),
    getPendingCount: () => 0,
  };
  useApp.mockReturnValue({
    state: { impostazioni: { notifiche_attive } },
    services: { notifications },
    actions: { setSetting },
  });
  return { cancelAll, requestPermission, setSetting, notifications };
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
