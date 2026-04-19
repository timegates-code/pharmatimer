// ============================================================
// useAutoBeep — fires a beep and a transient "flash" highlight whenever the
// wall-clock crosses one of today's pending doses.
//
// Sessione 7b-1 (AMB-7b.I): port of the auto-beep effect from v5 mockup
// (lines 955-977) into a reusable, self-contained hook. The hook owns no
// external state: it takes the entries it needs to watch, the resolved
// "now", and a pluggable `playBeepFn`, and returns a `Set<string>` of entry
// keys currently flashing. The consumer (DoseCard) reads this Set to toggle
// its `isFlashing` style.
//
// Crossing rule (forward-only):
//     prev < doseMin <= nowMin
//   where doseMin = timeToMinutes(entry.ora_ricalcolata ?? entry.ora_prevista)
//   and  prev    = previous tick's nowMin.
// Only entries with `dateStr === now.dateStr` and
// `stato ∈ {'prevista', 'ricalcolata'}` are considered candidates.
//
// Idempotency:
//   - A dedicated ref `triggeredKeys` remembers every key that has already
//     fired, so dragging the DevTimeSlider back and forth across the same
//     dose produces a single beep.
//   - On the very first render, `prev` is seeded with the current `nowMin`
//     and the effect early-returns — we never beep retroactively for doses
//     that were already past when the app mounted.
//
// Flash lifecycle:
//   - On a crossing, `playBeepFn()` is invoked and `flashingKeys` is set to
//     the new crossings.
//   - A single-shot `setTimeout(FLASH_DURATION_MS)` clears the flash back to
//     an empty Set. A new crossing during an active flash replaces the Set
//     and re-arms the timer (older timer is cancelled to avoid mid-flight
//     clears of the fresh flash).
//   - A dedicated unmount cleanup cancels any pending timer to avoid
//     setState-after-unmount warnings.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { timeToMinutes } from '../utils/time.js';

const FLASH_DURATION_MS = 1600;

/**
 * @param {import('../domain/types.js').PlanEntry[]} entries
 *   Plan entries to watch. Typically today's entries; the hook itself
 *   filters by `entry.dateStr === now.dateStr`, so passing a wider set
 *   is safe (just wasteful).
 * @param {{dateStr: string, minutes: number} | null | undefined} now
 *   Resolved "now" shape from `useNow()` / `resolveNow()`. When null or
 *   when `minutes` is missing, the hook is a no-op.
 * @param {() => void} [playBeepFn]
 *   Side-effect invoked on crossings. Optional: if absent, only the
 *   flash Set is updated.
 * @returns {Set<string>} keys of entries that are currently flashing.
 */
export function useAutoBeep(entries, now, playBeepFn) {
  const [flashingKeys, setFlashingKeys] = useState(() => new Set());
  const prevNowMin = useRef(now?.minutes ?? null);
  const triggeredKeys = useRef(new Set());
  const flashTimerId = useRef(null);

  useEffect(() => {
    const nowMin = now?.minutes;
    if (nowMin == null) return;

    const prev = prevNowMin.current;
    prevNowMin.current = nowMin;

    // Seed phase (first valid tick) or noop tick: nothing crossed.
    if (prev == null || prev === nowMin) return;

    const newlyCrossed = [];
    for (const e of entries) {
      if (e.dateStr !== now.dateStr) continue;
      if (e.stato !== 'prevista' && e.stato !== 'ricalcolata') continue;
      const doseMin = timeToMinutes(e.ora_ricalcolata ?? e.ora_prevista);
      // Forward crossing only. Backward motion (e.g. slider drag) is ignored
      // by the inequality; same-dose re-crosses are blocked by the Set.
      if (prev < doseMin && doseMin <= nowMin && !triggeredKeys.current.has(e.key)) {
        newlyCrossed.push(e.key);
        triggeredKeys.current.add(e.key);
      }
    }

    if (newlyCrossed.length === 0) return;

    if (typeof playBeepFn === 'function') playBeepFn();
    setFlashingKeys(new Set(newlyCrossed));

    // Re-arm the clear timer: cancel the previous one so a new crossing
    // during an existing flash gets its full FLASH_DURATION_MS window.
    if (flashTimerId.current !== null) clearTimeout(flashTimerId.current);
    flashTimerId.current = setTimeout(() => {
      setFlashingKeys(new Set());
      flashTimerId.current = null;
    }, FLASH_DURATION_MS);
  }, [now?.minutes, now?.dateStr, entries, playBeepFn]);

  // Unmount cleanup: ensure no pending timer tries to setState on a dead hook.
  useEffect(
    () => () => {
      if (flashTimerId.current !== null) {
        clearTimeout(flashTimerId.current);
        flashTimerId.current = null;
      }
    },
    []
  );

  return flashingKeys;
}
