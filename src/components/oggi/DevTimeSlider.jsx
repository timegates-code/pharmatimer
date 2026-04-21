// ============================================================
// DevTimeSlider — horizontal range input that drives `simulatedNow`.
//
// Sessione 7b-1 (AMB-7b.J):
//   - Range 0..1439 minutes (full day) in 5-min steps.
//   - The component itself does NOT check `import.meta.env.DEV`; the
//     OggiView parent renders it conditionally. This keeps the component
//     trivially renderable in tests and tooling.
//   - Token-aware via `useTheme()` (same pattern as NavBar in CP3). The
//     consumer passes only current value + onChange, keeping the prop
//     surface minimal despite the 5 tokens used (simBg/Bd/Tx + slider
//     Fill/Track).
//
// Conversion to `state.simulatedNow` (HH:MM string) is delegated to the
// parent: `onMinutesChange` reports the raw slider value, and OggiView
// wraps it with `actions.setSimulatedNow(minutesToTime(v))`.
// ============================================================

import { useTheme } from '../../hooks/useTheme.js';

const MIN_MINUTES = 0;
const MAX_MINUTES = 1439;
const STEP_MINUTES = 5;

/**
 * @param {{
 *   minutes: number,
 *   onMinutesChange: (m: number) => void,
 * }} props
 */
export function DevTimeSlider({ minutes, onMinutesChange }) {
  const { tokens: t } = useTheme();
  const safe = Number.isFinite(minutes) ? minutes : 0;
  const pct = (safe / MAX_MINUTES) * 100;

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg"
      style={{ background: t.simBg, border: `1px solid ${t.simBd}` }}
    >
      <span className="text-xs font-medium" style={{ color: t.simTx }}>
        Simula:
      </span>
      <input
        type="range"
        min={MIN_MINUTES}
        max={MAX_MINUTES}
        step={STEP_MINUTES}
        value={safe}
        onChange={(e) => onMinutesChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none"
        style={{
          background: `linear-gradient(to right, ${t.sliderFill} ${pct}%, ${t.sliderTrack} ${pct}%)`,
        }}
        aria-label="Simulatore ora (dev)"
      />
    </div>
  );
}
