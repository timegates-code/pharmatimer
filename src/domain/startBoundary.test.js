// ============================================================
// P20 par.4.8 (s.6.254) -- startBoundary pure helpers.
// par.22.198-duodecies. SENTINEL_P20_STARTBOUNDARY_TESTS
// ============================================================
import { describe, it, expect } from 'vitest';
import { computeTInizio, firstDoseAfterTInizio } from './startBoundary.js';

describe('computeTInizio -- regola a 3 rami + fallback (A)', () => {
  it('ramo =: data_inizio nel giorno di creazione -> created_at con ora', () => {
    expect(computeTInizio('2026-07-08', '2026-07-08T12:00:00')).toBe('2026-07-08T12:00:00');
  });

  it('ramo >: data_inizio futura -> 00:00 di data_inizio', () => {
    expect(computeTInizio('2026-07-10', '2026-07-08T12:00:00')).toBe('2026-07-10T00:00');
  });

  it('ramo <: data_inizio retro -> 00:00 di data_inizio', () => {
    expect(computeTInizio('2026-07-06', '2026-07-08T12:00:00')).toBe('2026-07-06T00:00');
  });

  it('fallback (A): created_at assente -> 00:00 di data_inizio', () => {
    expect(computeTInizio('2026-07-08', undefined)).toBe('2026-07-08T00:00');
    expect(computeTInizio('2026-07-08', null)).toBe('2026-07-08T00:00');
  });

  it('created_at malformato -> fallback (A)', () => {
    expect(computeTInizio('2026-07-08', 'garbage')).toBe('2026-07-08T00:00');
    expect(computeTInizio('2026-07-08', '2026-07-08')).toBe('2026-07-08T00:00');
  });

  it('data_inizio assente -> confine = created_at; entrambi assenti -> null (filtro inerte)', () => {
    expect(computeTInizio(null, '2026-07-08T12:00:00')).toBe('2026-07-08T12:00:00');
    expect(computeTInizio(null, null)).toBeNull();
  });
});

describe('firstDoseAfterTInizio -- R4 (deferito 44)', () => {
  const rowsStd = [
    { ora_prevista: '20:00' },
    { ora_prevista: '08:00' },
  ];

  it('standard: prima ora del giorno >= T_inizio (ordine cronologico, non di riga)', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T00:00', tipo: 'fisso',
      dataInizio: '2026-07-08', dataFine: null, intervalloOre: null, orari: rowsStd,
    });
    expect(out).toEqual({ dateStr: '2026-07-08', hhmm: '08:00' });
  });

  it('standard: T_inizio a meta giornata scavalca la dose passata', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T12:00', tipo: 'fisso',
      dataInizio: '2026-07-08', dataFine: null, intervalloOre: null, orari: rowsStd,
    });
    expect(out).toEqual({ dateStr: '2026-07-08', hhmm: '20:00' });
  });

  it('standard: rollover a domani quando tutte le ore del giorno sono passate', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T21:00', tipo: 'fisso',
      dataInizio: '2026-07-08', dataFine: null, intervalloOre: null, orari: rowsStd,
    });
    expect(out).toEqual({ dateStr: '2026-07-09', hhmm: '08:00' });
  });

  it('standard: rollover oltre data_fine -> null (toast omesso)', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T21:00', tipo: 'fisso',
      dataInizio: '2026-07-08', dataFine: '2026-07-08', intervalloOre: null, orari: rowsStd,
    });
    expect(out).toBeNull();
  });

  it('extended: stride dal primo k con occorrenza >= T_inizio', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T12:00', tipo: 'intervallo',
      dataInizio: '2026-07-08', dataFine: null, intervalloOre: 48,
      orari: [{ ora_prevista: '08:00' }],
    });
    expect(out).toEqual({ dateStr: '2026-07-10', hhmm: '08:00' });
  });

  it('fisso_date: prima coppia (data, ora) >= T_inizio', () => {
    const out = firstDoseAfterTInizio({
      tInizio: '2026-07-08T12:00', tipo: 'fisso_date',
      dataInizio: '2026-07-08', dataFine: '2026-07-09', intervalloOre: null,
      orari: [
        { ora_prevista: '08:00', data_specifica: '2026-07-08' },
        { ora_prevista: '08:00', data_specifica: '2026-07-09' },
      ],
    });
    expect(out).toEqual({ dateStr: '2026-07-09', hhmm: '08:00' });
  });

  it('orari vuoti o invalidi -> null', () => {
    expect(firstDoseAfterTInizio({
      tInizio: null, tipo: 'fisso', dataInizio: '2026-07-08',
      dataFine: null, intervalloOre: null, orari: [],
    })).toBeNull();
    expect(firstDoseAfterTInizio({
      tInizio: null, tipo: 'fisso', dataInizio: '2026-07-08',
      dataFine: null, intervalloOre: null, orari: [{ ora_prevista: 'boom' }],
    })).toBeNull();
  });
});
