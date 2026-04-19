// ============================================================
// Audio service — beep player for dose-time crossings.
//
// Sessione 7b-1 (AMB-7b.H): port 1:1 of the `playBeep` body from v5 mockup
// (lines 929-953), stripped of the React useCallback wrapper so that the
// exported function is pure with no internal state. The consumer (useAutoBeep
// in CP2) keeps its own refs for debouncing.
//
// Sound design (unchanged from mockup):
//   - Tone A: 880 Hz sine, starts at t0,    decays 0.3 → 0.01 by t0+0.4s.
//   - Tone B: 1100 Hz sine, starts at t0+0.15, decays 0.3 → 0.01 by t0+0.55s.
//   Total audible duration ≈ 0.55 s, with the two tones partially overlapping
//   to produce a two-note chirp.
//
// A try/catch swallows all errors: audio is a non-essential affordance and
// must never break the render path if the Web Audio API is unavailable
// (iOS autoplay policy before first user gesture, older browsers without
// AudioContext, constructor throwing, etc.).
// ============================================================

/**
 * Play a double-tone beep. No-op and silent failure when the Web Audio API
 * is unavailable or the AudioContext cannot be instantiated.
 * @returns {void}
 */
export function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    // First tone: 880 Hz, start immediately, decay by t0 + 0.4s.
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second tone: 1100 Hz, start at t0 + 0.15s, decay by t0 + 0.55s.
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.55);
  } catch {
    // Audio unavailable — silent fail. Intentional.
  }
}
