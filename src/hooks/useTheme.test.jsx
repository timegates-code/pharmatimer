import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AppContext } from '../state/AppContext.jsx';
import { initialState } from '../state/reducer.js';
import { useTheme } from './useTheme.js';

// Build a controllable matchMedia stub. `setMatches` triggers listeners.
function makeMatchMedia(initialMatches) {
  let matches = initialMatches;
  const listeners = new Set();
  const mq = {
    get matches() { return matches; },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_evt, fn) => listeners.add(fn),
    removeEventListener: (_evt, fn) => listeners.delete(fn),
  };
  return {
    mq,
    setMatches(next) {
      matches = next;
      for (const fn of listeners) fn({ matches: next });
    },
  };
}

// Build a Provider wrapper carrying a ready state with the requested tema.
function makeWrapper(mode) {
  const state = {
    ...initialState,
    status: 'ready',
    impostazioni: mode == null ? {} : { tema: mode },
  };
  const value = { state, actions: {}, tickMs: Date.now() };
  // eslint-disable-next-line react/prop-types
  return function Wrapper({ children }) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
  };
}

beforeEach(() => {
  // Default safe stub; individual tests override with makeMatchMedia.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (q) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

describe('useTheme', () => {
  it('mode="auto" + OS=dark → dark=true, tokens resolved', () => {
    const mm = makeMatchMedia(true);
    window.matchMedia = () => mm.mq;

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper('auto') });

    expect(result.current.mode).toBe('auto');
    expect(result.current.dark).toBe(true);
    // Sanity: tokens object is populated.
    expect(typeof result.current.tokens.pageBg).toBe('string');
  });

  it('mode="light" → dark=false even if OS prefers dark', () => {
    const mm = makeMatchMedia(true);
    window.matchMedia = () => mm.mq;

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper('light') });

    expect(result.current.mode).toBe('light');
    expect(result.current.dark).toBe(false);
  });

  it('mode="dark" → dark=true even if OS prefers light', () => {
    const mm = makeMatchMedia(false);
    window.matchMedia = () => mm.mq;

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper('dark') });

    expect(result.current.mode).toBe('dark');
    expect(result.current.dark).toBe(true);
  });

  it('mode="auto" reacts to matchMedia "change" events', () => {
    const mm = makeMatchMedia(false);
    window.matchMedia = () => mm.mq;

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper('auto') });
    expect(result.current.dark).toBe(false);

    act(() => { mm.setMatches(true); });
    expect(result.current.dark).toBe(true);
  });
});
