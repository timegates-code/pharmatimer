import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoBeep } from './useAutoBeep.js';

// Env: jsdom (vitest.config.js default). The hook uses useState/useRef/useEffect
// so a DOM-like environment is required; renderHook mounts a trivial host
// component internally.

const DAY = '2026-04-19';
const mkNow = (minutes) => ({ dateStr: DAY, minutes });
const mkEntry = (over = {}) => ({
  key: 'e1',
  dateStr: DAY,
  ora_prevista: '10:01',
  ora_ricalcolata: null,
  stato: 'prevista',
  ...over,
});

describe('useAutoBeep', () => {
  beforeEach(() => {
    // Fake timers let us observe the flash Set without actually waiting
    // 1.6s, and prevent pending-timer warnings on test teardown.
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not trigger on first render (prev seeded with current nowMin)', () => {
    const beep = vi.fn();
    const { result } = renderHook(
      ({ entries, now, play }) => useAutoBeep(entries, now, play),
      { initialProps: { entries: [mkEntry()], now: mkNow(600), play: beep } }
    );
    expect(beep).not.toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });

  it('fires beep and flags the entry as flashing when nowMin crosses doseMin forward', () => {
    const beep = vi.fn();
    const entry = mkEntry({ ora_prevista: '10:01' }); // doseMin = 601
    const { result, rerender } = renderHook(
      ({ entries, now, play }) => useAutoBeep(entries, now, play),
      { initialProps: { entries: [entry], now: mkNow(600), play: beep } }
    );
    // Tick: 10:00 → 10:01. Crossing condition met: 600 < 601 <= 601.
    act(() => {
      rerender({ entries: [entry], now: mkNow(601), play: beep });
    });
    expect(beep).toHaveBeenCalledTimes(1);
    expect(result.current.has('e1')).toBe(true);
  });

  it('does not re-fire beep for a key that has already crossed once', () => {
    const beep = vi.fn();
    const entry = mkEntry({ ora_prevista: '10:01' });
    const { rerender } = renderHook(
      ({ entries, now, play }) => useAutoBeep(entries, now, play),
      { initialProps: { entries: [entry], now: mkNow(600), play: beep } }
    );
    // First tick: crossing registered.
    act(() => {
      rerender({ entries: [entry], now: mkNow(601), play: beep });
    });
    expect(beep).toHaveBeenCalledTimes(1);
    // Further ticks move past the dose but triggeredKeys blocks a second fire.
    act(() => {
      rerender({ entries: [entry], now: mkNow(605), play: beep });
    });
    expect(beep).toHaveBeenCalledTimes(1);
  });
});
