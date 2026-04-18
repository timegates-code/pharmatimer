// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  addDays,
  calcolaDelta,
  formatDelta,
  formatDuration,
  formatGapLabel,
} from './time.js';

describe('timeToMinutes / minutesToTime — round-trip', () => {
  it('dovrebbe essere inverse per "00:00"', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('dovrebbe essere inverse per "07:30"', () => {
    expect(timeToMinutes('07:30')).toBe(450);
    expect(minutesToTime(450)).toBe('07:30');
  });

  it('dovrebbe essere inverse per "23:59"', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('addDays', () => {
  it('dovrebbe aggiungere 1 giorno senza shift UTC', () => {
    expect(addDays('2026-04-16', 1)).toBe('2026-04-17');
  });

  it('dovrebbe gestire n negativo', () => {
    expect(addDays('2026-04-16', -1)).toBe('2026-04-15');
  });
});

describe('formatDelta', () => {
  it('dovrebbe ritornare "in orario" per 0', () => {
    expect(formatDelta(0)).toBe('in orario');
  });

  it('dovrebbe ritornare "+5 min" per +5', () => {
    expect(formatDelta(5)).toBe('+5 min');
  });

  it('dovrebbe ritornare "-5 min" per -5', () => {
    expect(formatDelta(-5)).toBe('-5 min');
  });

  it('dovrebbe ritornare "+45 min" per +45', () => {
    expect(formatDelta(45)).toBe('+45 min');
  });

  it('dovrebbe ritornare "-1h" per -60', () => {
    expect(formatDelta(-60)).toBe('-1h');
  });

  it('dovrebbe ritornare "+2h 05min" per +125', () => {
    expect(formatDelta(125)).toBe('+2h 05min');
  });

  it('dovrebbe ritornare "-8h" per -480', () => {
    expect(formatDelta(-480)).toBe('-8h');
  });
});

describe('formatDuration', () => {
  it('dovrebbe ritornare "0 min" per 0', () => {
    expect(formatDuration(0)).toBe('0 min');
  });

  it('dovrebbe ritornare "45 min" per 45', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('dovrebbe ritornare "1h" per 60', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('dovrebbe ritornare "1h 15min" per 75', () => {
    expect(formatDuration(75)).toBe('1h 15min');
  });

  it('dovrebbe ritornare "24h" per 1440', () => {
    expect(formatDuration(1440)).toBe('24h');
  });
});

describe('formatGapLabel', () => {
  it('dovrebbe ritornare null per 0', () => {
    expect(formatGapLabel(0)).toBe(null);
  });

  it('dovrebbe ritornare "ritardo 1h 30min" per +90', () => {
    expect(formatGapLabel(90)).toBe('ritardo 1h 30min');
  });

  it('dovrebbe ritornare "anticipo 45 min" per -45', () => {
    expect(formatGapLabel(-45)).toBe('anticipo 45 min');
  });
});

describe('calcolaDelta — DATETIME-based, no wraparound', () => {
  it('dovrebbe ritornare +60 per 23:30 → 00:30 del giorno dopo', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-04-16',
        oraPrevista: '23:30',
        dataEffettiva: '2026-04-17',
        oraEffettiva: '00:30',
      })
    ).toBe(60);
  });

  it('dovrebbe ritornare -60 per 00:30 → 23:30 del giorno prima', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-04-17',
        oraPrevista: '00:30',
        dataEffettiva: '2026-04-16',
        oraEffettiva: '23:30',
      })
    ).toBe(-60);
  });

  it('dovrebbe ritornare +780 per 08:00 → 21:00 stesso giorno (regressione bug wraparound v5)', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-04-16',
        oraPrevista: '08:00',
        dataEffettiva: '2026-04-16',
        oraEffettiva: '21:00',
      })
    ).toBe(780);
  });

  it('dovrebbe ritornare 0 quando previsto === effettivo', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-04-16',
        oraPrevista: '08:00',
        dataEffettiva: '2026-04-16',
        oraEffettiva: '08:00',
      })
    ).toBe(0);
  });
});
