// ============================================================
// shouldOpenOnboarding unit tests — BUG-m fix (s.6.251, par.22.193).
// Pure helper, no DOM (pattern App.magiclink.test.js).
// SENTINEL_BUGM_S6251_TEST_GATE
// ============================================================
import { describe, it, expect } from 'vitest';
import { shouldOpenOnboarding } from './App.jsx';

describe('shouldOpenOnboarding (BUG-m s.6.251)', () => {
  it('closed while init is not ready', () => {
    expect(shouldOpenOnboarding('loading', null, null)).toBe(false);
  });

  it('closed when the IndexedDB flag is set', () => {
    expect(shouldOpenOnboarding('ready', 1, null)).toBe(false);
  });

  it('closed when only the localStorage mirror is set (mobile reload, Finding #10)', () => {
    expect(shouldOpenOnboarding('ready', null, '1')).toBe(false);
  });

  it('open on true first run (ready, no flag anywhere)', () => {
    expect(shouldOpenOnboarding('ready', null, null)).toBe(true);
  });
});
