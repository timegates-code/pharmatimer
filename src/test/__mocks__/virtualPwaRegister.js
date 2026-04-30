// ============================================================
// virtualPwaRegister — physical mock for `virtual:pwa-register`.
// Sessione 10-B CP4 hot-fix (§6.154).
//
// Why this exists:
//   `virtual:pwa-register` is a virtual module synthesised by
//   `vite-plugin-pwa` at build/dev time. In the Vitest environment
//   that plugin is not active, so the import fails at transform
//   time (`vite:import-analysis` cannot resolve the specifier) —
//   well before `vi.mock(...)` could intercept it at runtime.
//
//   `vitest.config.js` aliases `'virtual:pwa-register'` to this
//   physical file (resolve.alias array form, regex match), so the
//   transform sees a real on-disk module and the test process loads
//   it directly.
//
// Production build is unaffected: this alias lives only in
// `vitest.config.js`, never in `vite.config.js`.
//
// Test API:
//   registerSW(options)        — same shape as the real plugin
//                                export. Captures `options` so
//                                tests can later fire
//                                `options.onNeedRefresh()` etc.
//                                Returns a thin wrapper around the
//                                injectable `updateSW` impl.
//   __setUpdateSWMock(fn)      — install a vi.fn() (or any fn) so
//                                the test can assert against
//                                `triggerUpdate()` calls.
//   __getLastOptions()         — read back the options passed to
//                                the most recent registerSW call.
//   __getCallCount()           — number of registerSW invocations
//                                since the last __reset().
//   __reset()                  — clear all state (call from
//                                beforeEach).
// ============================================================

let lastOptions = null;
let callCount = 0;
let updateSWImpl = () => {};

export function registerSW(options) {
  lastOptions = options;
  callCount += 1;
  // Late-binding wrapper: dereferences `updateSWImpl` at call time,
  // so __setUpdateSWMock can be called either before or after
  // setupPWA() with the same effect.
  return (...args) => updateSWImpl(...args);
}

export function __setUpdateSWMock(fn) {
  updateSWImpl = fn;
}

export function __getLastOptions() {
  return lastOptions;
}

export function __getCallCount() {
  return callCount;
}

export function __reset() {
  lastOptions = null;
  callCount = 0;
  updateSWImpl = () => {};
}
