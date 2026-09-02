// @vitest-environment node
// ============================================================
// DST -- la porta fra ora di parete e istanti (decisione 1, ibrido dichiarato).
//
// OGNI test di questo file asserisce almeno un fatto FALSO in un fuso senza
// ora legale. Non e una convenzione: `make controllo-dst` fa girare i file
// *.dst.test.js con TZ=Etc/UTC e una config senza pin e pretende che
// NESSUNO passi. Un test verde senza ora legale non misura lo ora legale.
// Sotto il pin della suite (Europe/Rome, vitest.config.js) passano tutti.
//
// Transizioni misurate, Italia 2026: 29 marzo 02:00 -> 03:00 (ora
// inesistente), 25 ottobre 03:00 -> 02:00 (ora doppia).
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  wallToInstant,
  normalizeWallTime,
  calcolaDelta,
  addMinutesToIso,
  parseIsoDateTime,
} from './time.js';

const wall = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('wallToInstant -- ora inesistente, 29 marzo', () => {
  it('02:30 scivola al primo istante esistente: 03:00 CEST, cioe 01:00Z, non 03:30', () => {
    const d = wallToInstant('2026-03-29', '02:30');
    expect(d.toISOString()).toBe('2026-03-29T01:00:00.000Z');
    expect(wall(d)).toBe('03:00');
    expect(d.getTimezoneOffset()).toBe(-120);
  });

  it('02:00 e 02:59 scivolano sullo STESSO istante: la finestra intera collassa sul confine', () => {
    expect(wallToInstant('2026-03-29', '02:00').toISOString()).toBe('2026-03-29T01:00:00.000Z');
    expect(wallToInstant('2026-03-29', '02:59').toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  it('01:59 resta 01:59 ed e ancora ora solare (offset -60)', () => {
    const d = wallToInstant('2026-03-29', '01:59');
    expect(wall(d)).toBe('01:59');
    expect(d.getTimezoneOffset()).toBe(-60);
    expect(d.toISOString()).toBe('2026-03-29T00:59:00.000Z');
  });

  it('03:00 esiste gia, e ora legale, ed e lo stesso istante su cui scivola 02:30', () => {
    const d = wallToInstant('2026-03-29', '03:00');
    expect(d.getTimezoneOffset()).toBe(-120);
    expect(d.getTime()).toBe(wallToInstant('2026-03-29', '02:30').getTime());
  });
});

describe('wallToInstant -- ora doppia, 25 ottobre', () => {
  it('02:30 conta la PRIMA occorrenza: ora legale, offset -120, 00:30Z', () => {
    const d = wallToInstant('2026-10-25', '02:30');
    expect(wall(d)).toBe('02:30');
    expect(d.getTimezoneOffset()).toBe(-120);
    expect(d.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('01:59 e ancora ora legale e 03:00 e gia ora solare: fra i due corre una ora reale in piu', () => {
    const a = wallToInstant('2026-10-25', '01:59');
    const b = wallToInstant('2026-10-25', '03:00');
    expect(a.getTimezoneOffset()).toBe(-120);
    expect(b.getTimezoneOffset()).toBe(-60);
    expect((b.getTime() - a.getTime()) / 60000).toBe(121);
  });
});

describe('normalizeWallTime -- la etichetta del giorno', () => {
  it('29 marzo: 02:30 diventa 03:00; il giorno prima e il giorno dopo restano 02:30', () => {
    expect(normalizeWallTime('2026-03-29', '02:30')).toBe('03:00');
    expect(normalizeWallTime('2026-03-28', '02:30')).toBe('02:30');
    expect(normalizeWallTime('2026-03-30', '02:30')).toBe('02:30');
  });

  it('25 ottobre: 02:30 resta 02:30 perche esiste, due volte, e conta la prima', () => {
    expect(normalizeWallTime('2026-10-25', '02:30')).toBe('02:30');
    expect(wallToInstant('2026-10-25', '02:30').getTimezoneOffset()).toBe(-120);
  });
});

describe('calcolaDelta -- minuti REALI, non di parete', () => {
  it('23:00 -> 07:00 nella notte del 29 marzo sono 420 minuti, non 480', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-03-28',
        oraPrevista: '23:00',
        dataEffettiva: '2026-03-29',
        oraEffettiva: '07:00',
      })
    ).toBe(420);
  });

  it('23:00 -> 07:00 nella notte del 25 ottobre sono 540 minuti', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-10-24',
        oraPrevista: '23:00',
        dataEffettiva: '2026-10-25',
        oraEffettiva: '07:00',
      })
    ).toBe(540);
  });

  it('dose prevista alle 02:30 del 29 marzo, scivolata a 03:00: presa alle 03:00 vale 0, alle 03:30 vale +30', () => {
    const base = { dataPrevista: '2026-03-29', oraPrevista: '02:30', dataEffettiva: '2026-03-29' };
    expect(calcolaDelta({ ...base, oraEffettiva: '03:00' })).toBe(0);
    expect(calcolaDelta({ ...base, oraEffettiva: '03:30' })).toBe(30);
  });

  it('25 ottobre: 01:30 -> 02:30 vale 60 (prima occorrenza), 02:30 -> 03:00 vale 90 perche in mezzo corre il ritorno', () => {
    expect(
      calcolaDelta({
        dataPrevista: '2026-10-25',
        oraPrevista: '01:30',
        dataEffettiva: '2026-10-25',
        oraEffettiva: '02:30',
      })
    ).toBe(60);
    expect(
      calcolaDelta({
        dataPrevista: '2026-10-25',
        oraPrevista: '02:30',
        dataEffettiva: '2026-10-25',
        oraEffettiva: '03:00',
      })
    ).toBe(90);
  });
});

describe('addMinutesToIso -- aritmetica di PARETE, dichiarata', () => {
  it('23:00 + 480 e 07:00 su entrambe le notti, e i minuti reali sono 420 e 540', () => {
    expect(addMinutesToIso('2026-03-28T23:00', 480)).toBe('2026-03-29T07:00');
    expect(addMinutesToIso('2026-10-24T23:00', 480)).toBe('2026-10-25T07:00');
    const reali = (dataPrevista, dataEffettiva) =>
      calcolaDelta({ dataPrevista, oraPrevista: '23:00', dataEffettiva, oraEffettiva: '07:00' });
    expect(reali('2026-03-28', '2026-03-29')).toBe(420);
    expect(reali('2026-10-24', '2026-10-25')).toBe(540);
  });

  it('identita su una ora inesistente: 02:30 + 0 del 29 marzo e 03:00, non 03:30', () => {
    expect(addMinutesToIso('2026-03-29T02:30', 0)).toBe('2026-03-29T03:00');
  });
});

describe('parseIsoDateTime.dateObj -- passa dalla porta', () => {
  it('02:30 del 29 marzo e lo istante 01:00Z, e la etichetta resta quella scritta', () => {
    const r = parseIsoDateTime('2026-03-29T02:30');
    expect(r.hhmm).toBe('02:30');
    expect(r.dateObj.toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });
});
