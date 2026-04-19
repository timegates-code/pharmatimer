// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  getCardState,
  isCrossMidnightRecalc,
  formatDelta,
  formatDuration,
  formatGapLabel,
  formatDateLabel,
} from './uiState.js';

// Minimal entry factory — only the fields uiState reads from.
function mkEntry(over = {}) {
  return {
    key: 'x',
    dateStr: '2026-04-19',
    farmaco: { id: 1 },
    orario: { dose_numero: 1 },
    ora_prevista: '10:00',
    ora_ricalcolata: null,
    ora_ricalcolata_originale: null,
    ora_effettiva: null,
    delta_minuti: null,
    gap_minuti: 0,
    gap_originale: 0,
    recupero_minuti: 0,
    stato: 'prevista',
    dose_prec_saltata: false,
    ...over,
  };
}

describe('getCardState', () => {
  // now = 2026-04-19 10:00
  const now = { dateStr: '2026-04-19', minutes: 10 * 60 };

  it('returns "presa" for stato=presa regardless of time', () => {
    expect(getCardState(mkEntry({ stato: 'presa', ora_prevista: '09:00' }), now)).toBe('presa');
  });

  it('returns "saltata" for stato=saltata regardless of time', () => {
    expect(getCardState(mkEntry({ stato: 'saltata', ora_prevista: '09:00' }), now)).toBe('saltata');
  });

  it('returns "sospesa" for stato=sospesa regardless of time', () => {
    expect(getCardState(mkEntry({ stato: 'sospesa', ora_prevista: '09:00' }), now)).toBe('sospesa');
  });

  it('returns "in_attesa" for entries on a different day (future)', () => {
    expect(getCardState(mkEntry({ dateStr: '2026-04-20', ora_prevista: '06:00' }), now)).toBe('in_attesa');
  });

  it('returns "in_attesa" for entries on a different day (past, never in_ritardo)', () => {
    expect(getCardState(mkEntry({ dateStr: '2026-04-18', ora_prevista: '06:00' }), now)).toBe('in_attesa');
  });

  it('returns "in_attesa" for doses more than 30 min in the future', () => {
    expect(getCardState(mkEntry({ ora_prevista: '10:31' }), now)).toBe('in_attesa');
  });

  it('returns "prossima" at exactly 30 min ahead (upper boundary inclusive)', () => {
    expect(getCardState(mkEntry({ ora_prevista: '10:30' }), now)).toBe('prossima');
  });

  it('returns "prossima" at dose time exactly (diff = 0)', () => {
    expect(getCardState(mkEntry({ ora_prevista: '10:00' }), now)).toBe('prossima');
  });

  it('returns "prossima" within tolerance past (-15 min exactly, lower boundary inclusive)', () => {
    expect(getCardState(mkEntry({ ora_prevista: '09:45' }), now)).toBe('prossima');
  });

  it('returns "in_ritardo" just past tolerance (-16 min)', () => {
    expect(getCardState(mkEntry({ ora_prevista: '09:44' }), now)).toBe('in_ritardo');
  });

  it('prefers ora_ricalcolata over ora_prevista when present', () => {
    expect(
      getCardState(mkEntry({ ora_prevista: '09:00', ora_ricalcolata: '10:30' }), now)
    ).toBe('prossima');
  });

  it('state="ricalcolata" uses temporal state (not a stato of its own)', () => {
    // ricalcolata + ora_ricalcolata past tolerance → in_ritardo
    expect(
      getCardState(
        mkEntry({ stato: 'ricalcolata', ora_prevista: '08:00', ora_ricalcolata: '09:00' }),
        now
      )
    ).toBe('in_ritardo');
  });
});

describe('isCrossMidnightRecalc', () => {
  it('returns true when ora_ricalcolata wraps past midnight', () => {
    expect(
      isCrossMidnightRecalc({ ora_prevista: '23:00', ora_ricalcolata: '07:00' })
    ).toBe(true);
  });

  it('returns false for a normal forward recalc within the same day', () => {
    expect(
      isCrossMidnightRecalc({ ora_prevista: '16:00', ora_ricalcolata: '16:30' })
    ).toBe(false);
  });

  it('returns false when ora_ricalcolata is null', () => {
    expect(
      isCrossMidnightRecalc({ ora_prevista: '10:00', ora_ricalcolata: null })
    ).toBe(false);
  });
});

describe('formatDelta', () => {
  it('returns "in orario" for 0', () => {
    expect(formatDelta(0)).toBe('in orario');
  });

  it('formats small positive values in minutes with sign', () => {
    expect(formatDelta(15)).toBe('+15 min');
  });

  it('formats hours and minutes for larger negative values', () => {
    expect(formatDelta(-75)).toBe('-1h 15min');
  });
});

describe('formatDuration', () => {
  it('formats values below 60 as minutes', () => {
    expect(formatDuration(30)).toBe('30 min');
  });

  it('formats whole hours without minutes suffix', () => {
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('formatGapLabel', () => {
  it('returns null for zero gap', () => {
    expect(formatGapLabel(0)).toBeNull();
  });

  it('prefixes "ritardo" for positive gap', () => {
    expect(formatGapLabel(45)).toBe('ritardo 45 min');
  });
});

describe('formatDateLabel', () => {
  it('prefixes "Oggi" when dateStr matches refDateStr', () => {
    const s = formatDateLabel('2026-04-19', '2026-04-19');
    expect(s.startsWith('Oggi ·')).toBe(true);
  });
});
