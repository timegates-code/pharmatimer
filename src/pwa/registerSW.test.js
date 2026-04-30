// ============================================================
// registerSW.test — Sessione 10-B CP4 (AMB-10.G), hot-fix §6.154.
//
// `virtual:pwa-register` is aliased in vitest.config.js to a
// physical mock at src/test/__mocks__/virtualPwaRegister.js. We
// import the mock's test API from the same alias name so the SUT
// (registerSW.js) and the test load the same module instance.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  __setUpdateSWMock,
  __getLastOptions,
  __getCallCount,
  __reset,
} from 'virtual:pwa-register';
import {
  setupPWA,
  subscribeUpdateAvailable,
  triggerUpdate,
  __TEST_ONLY_reset,
} from './registerSW.js';

describe('registerSW', () => {
  beforeEach(() => {
    __TEST_ONLY_reset();
    __reset();
    // jsdom does not expose navigator.serviceWorker by default.
    if (typeof navigator !== 'undefined' && !('serviceWorker' in navigator)) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {},
        configurable: true,
      });
    }
  });

  it('setupPWA registers SW with onNeedRefresh and onOfflineReady', async () => {
    await setupPWA();
    expect(__getCallCount()).toBe(1);
    const opts = __getLastOptions();
    expect(opts).toBeTruthy();
    expect(typeof opts.onNeedRefresh).toBe('function');
    expect(typeof opts.onOfflineReady).toBe('function');
  });

  it('onNeedRefresh notifies all subscribers; late subscribers receive current flag synchronously', async () => {
    await setupPWA();

    const earlyListener = vi.fn();
    subscribeUpdateAvailable(earlyListener);
    expect(earlyListener).toHaveBeenLastCalledWith(false);

    // Fire SW update notification by invoking the captured callback.
    __getLastOptions().onNeedRefresh();
    expect(earlyListener).toHaveBeenLastCalledWith(true);

    // Late subscriber: registered after onNeedRefresh — must receive
    // the current flag (`true`) synchronously via replay.
    const lateListener = vi.fn();
    subscribeUpdateAvailable(lateListener);
    expect(lateListener).toHaveBeenCalledWith(true);
  });

  it('triggerUpdate invokes the updateSW function returned by registerSW', async () => {
    const updateSWMock = vi.fn();
    __setUpdateSWMock(updateSWMock);

    await setupPWA();
    triggerUpdate();
    expect(updateSWMock).toHaveBeenCalledTimes(1);
  });
});
