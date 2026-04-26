// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  getCardState,
  isEntryFutureDate,
  formatDelta,
  formatDuration,
  formatGapLabel,
  formatDateLabel,
  groupEntriesByDayAndMomento,
} from './uiState.js';

// Minimal entry factory — only the fields uiState reads from.
// Note (9-A): `ora_ricalcolata` shape is now ISO 'YYYY-MM-DDTHH:MM' (§6.18 fix
// CP3 + §6.117a typedef). HH:MM is reserved for `ora_prevista`.
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

  it('prefers ora_ricalcolata (ISO) over ora_prevista when present', () => {
    // §6.116b: ora_ricalcolata is now ISO 'YYYY-MM-DDTHH:MM'; getCardState
    // must extract HH:MM before feeding timeToMinutes.
    expect(
      getCardState(
        mkEntry({ ora_prevista: '09:00', ora_ricalcolata: '2026-04-19T10:30' }),
        now
      )
    ).toBe('prossima');
  });

  it('state="ricalcolata" uses temporal state (not a stato of its own)', () => {
    // ricalcolata + ora_ricalcolata past tolerance → in_ritardo
    expect(
      getCardState(
        mkEntry({ stato: 'ricalcolata', ora_prevista: '08:00', ora_ricalcolata: '2026-04-19T09:00' }),
        now
      )
    ).toBe('in_ritardo');
  });
});

describe('isEntryFutureDate', () => {
  // §6.116 — replaces isCrossMidnightRecalc detector (§6.26 tear-down).

  it('returns false when entry.dateStr equals todayDateStr', () => {
    expect(
      isEntryFutureDate(
        { dateStr: '2026-04-19' },
        '2026-04-19'
      )
    ).toBe(false);
  });

  it('returns true when entry.dateStr is past todayDateStr (tomorrow)', () => {
    expect(
      isEntryFutureDate(
        { dateStr: '2026-04-20' },
        '2026-04-19'
      )
    ).toBe(true);
  });

  it('returns false when entry.dateStr is before todayDateStr (yesterday)', () => {
    expect(
      isEntryFutureDate(
        { dateStr: '2026-04-18' },
        '2026-04-19'
      )
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

describe('groupEntriesByDayAndMomento', () => {
  it('returns an empty array for empty input', () => {
    expect(groupEntriesByDayAndMomento([])).toEqual([]);
  });

  it('sorts days by dateStr ascending even when input order is reversed', () => {
    const entries = [
      mkEntry({ key: 'a', dateStr: '2026-04-20', ora_prevista: '08:00' }),
      mkEntry({ key: 'b', dateStr: '2026-04-19', ora_prevista: '08:00' }),
    ];
    const out = groupEntriesByDayAndMomento(entries);
    expect(out.map(d => d.dateStr)).toEqual(['2026-04-19', '2026-04-20']);
  });

  it('sorts entries within a day by effective time, using ora_ricalcolata (ISO) when set', () => {
    // §6.116b: ora_ricalcolata is ISO 'YYYY-MM-DDTHH:MM'; sort must extract HH:MM.
    // "a" is scheduled at 15:00 but recalculated to 09:00 → must appear before "b" (12:00).
    const entries = [
      mkEntry({ key: 'b', ora_prevista: '12:00' }),
      mkEntry({ key: 'a', ora_prevista: '15:00', ora_ricalcolata: '2026-04-19T09:00' }),
    ];
    const out = groupEntriesByDayAndMomento(entries);
    expect(out).toHaveLength(1);
    expect(out[0].groups[0].entries.map(e => e.key)).toEqual(['a', 'b']);
    // primaOra must be HH:MM (extracted from ISO), not the raw ISO string.
    expect(out[0].groups[0].primaOra).toBe('09:00');
  });

  it('opens a new group whenever descrizione_momento changes', () => {
    const entries = [
      mkEntry({
        key: 'a', ora_prevista: '08:00',
        orario: { dose_numero: 1, descrizione_momento: 'colazione' },
      }),
      mkEntry({
        key: 'b', ora_prevista: '08:30',
        orario: { dose_numero: 1, descrizione_momento: 'colazione' },
      }),
      mkEntry({
        key: 'c', ora_prevista: '13:00',
        orario: { dose_numero: 1, descrizione_momento: 'pranzo' },
      }),
    ];
    const out = groupEntriesByDayAndMomento(entries);
    expect(out[0].groups).toHaveLength(2);
    expect(out[0].groups[0].descrizioneMomento).toBe('colazione');
    expect(out[0].groups[0].primaOra).toBe('08:00');
    expect(out[0].groups[0].entries.map(e => e.key)).toEqual(['a', 'b']);
    expect(out[0].groups[1].descrizioneMomento).toBe('pranzo');
    expect(out[0].groups[1].primaOra).toBe('13:00');
  });

  it('collapses consecutive entries with the same momento into a single group', () => {
    // Both entries share the same momento (and both have null momento variants
    // would collapse the same way — tested implicitly by absence of the field).
    const entries = [
      mkEntry({
        key: 'a', ora_prevista: '07:00',
        orario: { dose_numero: 1, descrizione_momento: 'colazione' },
      }),
      mkEntry({
        key: 'b', ora_prevista: '08:00',
        orario: { dose_numero: 1, descrizione_momento: 'colazione' },
      }),
    ];
    const out = groupEntriesByDayAndMomento(entries);
    expect(out[0].groups).toHaveLength(1);
    expect(out[0].groups[0].entries).toHaveLength(2);
    expect(out[0].groups[0].primaOra).toBe('07:00');
  });
});
