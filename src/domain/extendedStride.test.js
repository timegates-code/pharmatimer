// @vitest-environment node
// ============================================================
// P15-A -- canone della cadenza extended (deferito 55).
// par.22.198-quindecies-bis. SENTINEL_P15A_EXTENDEDSTRIDE_TESTS
//
// I pin CIVILI sono TZ-INDIPENDENTI PER COSTRUZIONE: addDays ancora a
// mezzogiorno, quindi valgono in Europe/Rome come in UTC come altrove.
// I pin MS usano 30h in date LONTANE dal DST -> stabili in ogni fuso.
// Nessun process.env.TZ, nessun tocco a vite.config.js (VIETATO).
//
// NB: il difetto ms NON e pinnato come atteso -- sarebbe testare il bug che
// si conserva. Le misure M2-M5 vivono nel fileoverview e nel Changelog,
// dove documentano PERCHE la biforcazione esiste.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  isCivilDayStride,
  occurrenceDateAt,
  firstKOnOrAfterIso,
} from './extendedStride.js';

describe('isCivilDayStride -- biforcazione Q-P15-2', () => {
  it('true per i multipli di 24 raggiungibili su decimal(4,1)', () => {
    expect(isCivilDayStride(24)).toBe(true);
    expect(isCivilDayStride(48)).toBe(true);
    expect(isCivilDayStride(168)).toBe(true);
    expect(isCivilDayStride(984)).toBe(true);
  });

  it('false per i non-multipli, inclusi i decimali che tentano il float', () => {
    expect(isCivilDayStride(30)).toBe(false);
    expect(isCivilDayStride(36)).toBe(false);
    expect(isCivilDayStride(26.4)).toBe(false);
    expect(isCivilDayStride(999.9)).toBe(false);
  });

  it('false fuori dominio: 0, negativi, null/undefined/NaN, stringhe', () => {
    expect(isCivilDayStride(0)).toBe(false);
    expect(isCivilDayStride(-24)).toBe(false);
    expect(isCivilDayStride(null)).toBe(false);
    expect(isCivilDayStride(undefined)).toBe(false);
    expect(isCivilDayStride(NaN)).toBe(false);
    expect(isCivilDayStride('48')).toBe(false);
  });
});

describe('occurrenceDateAt -- ramo CIVILE (multipli di 24)', () => {
  it('k=0 e sempre data_inizio, qualunque ora', () => {
    expect(occurrenceDateAt('2026-10-24', '00:30', 48, 0)).toBe('2026-10-24');
    expect(occurrenceDateAt('2026-03-28', '23:30', 48, 0)).toBe('2026-03-28');
  });

  it('M3 -- fall-back (25 ott): 48h da 10-24 00:30 -> 10-26, non 10-25', () => {
    expect(occurrenceDateAt('2026-10-24', '00:30', 48, 1)).toBe('2026-10-26');
  });

  it('M4 -- spring-forward (29 mar): 48h da 03-28 23:30 -> 03-30, non 03-31', () => {
    expect(occurrenceDateAt('2026-03-28', '23:30', 48, 1)).toBe('2026-03-30');
  });

  it('M5 -- settimanale 168h da 10-20 00:30 -> 10-27, non 10-26 (metotrexato)', () => {
    expect(occurrenceDateAt('2026-10-20', '00:30', 168, 1)).toBe('2026-10-27');
    expect(occurrenceDateAt('2026-10-20', '00:30', 168, 2)).toBe('2026-11-03');
  });

  it('la cadenza civile e indipendente dall ora: 48h da 07-08 -> 07-10, 07-12', () => {
    expect(occurrenceDateAt('2026-07-08', '08:00', 48, 1)).toBe('2026-07-10');
    expect(occurrenceDateAt('2026-07-08', '08:00', 48, 2)).toBe('2026-07-12');
  });
});

describe('occurrenceDateAt -- ramo MS (non-multipli, legacy preservato)', () => {
  it('30h lontano dal DST: la data avanza di 1 o 2 giorni alternando', () => {
    expect(occurrenceDateAt('2026-07-01', '08:00', 30, 0)).toBe('2026-07-01');
    expect(occurrenceDateAt('2026-07-01', '08:00', 30, 1)).toBe('2026-07-02');
    expect(occurrenceDateAt('2026-07-01', '08:00', 30, 2)).toBe('2026-07-03');
    expect(occurrenceDateAt('2026-07-01', '08:00', 30, 3)).toBe('2026-07-05');
    expect(occurrenceDateAt('2026-07-01', '08:00', 30, 4)).toBe('2026-07-06');
  });
});

describe('firstKOnOrAfterIso -- confine comune ai due chiamanti', () => {
  it('confine gia soddisfatto a k=0 -> 0', () => {
    expect(firstKOnOrAfterIso('2026-07-08', '08:00', 48, '2026-07-08T00:00')).toBe(0);
  });

  it('civile: confine a meta giornata scavalca la dose del giorno stesso', () => {
    expect(firstKOnOrAfterIso('2026-07-08', '08:00', 48, '2026-07-08T12:00')).toBe(1);
  });

  it('i SECONDI del confine escludono la dose dello stesso minuto (P20, by design)', () => {
    expect(firstKOnOrAfterIso('2026-07-08', '08:00', 48, '2026-07-08T08:00')).toBe(0);
    expect(firstKOnOrAfterIso('2026-07-08', '08:00', 48, '2026-07-08T08:00:00')).toBe(1);
  });

  it('ms: 30h, confine a 3 giorni -> k=3', () => {
    expect(firstKOnOrAfterIso('2026-07-01', '08:00', 30, '2026-07-04T00:00')).toBe(3);
  });

  it('il k restituito soddisfa il confine e k-1 no (minimalita)', () => {
    const di = '2026-10-20';
    const op = '00:30';
    const b = '2026-10-27T00:00';
    const k = firstKOnOrAfterIso(di, op, 168, b);
    expect(`${occurrenceDateAt(di, op, 168, k)}T${op}`.localeCompare(b)).toBeGreaterThanOrEqual(0);
    expect(`${occurrenceDateAt(di, op, 168, k - 1)}T${op}` < b).toBe(true);
  });
});
