// SENTINEL_N5QC_CP4BIS_AUTOCLEAR_TEST -- drift-N53: pure-helper coverage.
// Copre la matrice scenari S-A / S-B / S-C + no-op difensivi senza
// mockare window.location.reload (il gate React e' testato indirettamente
// dagli scenari e2e; qui si valida la sola logica decisionale pura).
import { describe, it, expect } from 'vitest';
import { shouldAutoClearUnauthorized } from './App.jsx';

describe('shouldAutoClearUnauthorized (CP4-bis drift-N53)', () => {
  it('S-A: UNAUTHORIZED senza token -> no auto-clear (evita loop reload)', () => {
    expect(shouldAutoClearUnauthorized('UNAUTHORIZED', false)).toBe(false);
  });

  it('S-B/S-C: UNAUTHORIZED con token presente -> auto-clear', () => {
    expect(shouldAutoClearUnauthorized('UNAUTHORIZED', true)).toBe(true);
  });

  it('DB_UNAVAILABLE con token valido -> nessun logout indebito', () => {
    expect(shouldAutoClearUnauthorized('DB_UNAVAILABLE', true)).toBe(false);
  });

  it('NO_ACTIVE_PROFILE con token valido -> nessun logout indebito', () => {
    expect(shouldAutoClearUnauthorized('NO_ACTIVE_PROFILE', true)).toBe(false);
  });

  it('errore assente (undefined) con token -> no-op', () => {
    expect(shouldAutoClearUnauthorized(undefined, true)).toBe(false);
  });
});
