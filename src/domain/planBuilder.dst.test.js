// @vitest-environment node
// ============================================================
// DST nel piano (decisione 1): la etichetta di una dose e risolta SUL GIORNO.
// Ogni test asserisce un fatto falso senza ora legale (vedi time.dst.test.js
// e `make controllo-dst`).
// ============================================================
import { describe, it, expect } from 'vitest';
import { buildMultiDayPlan } from './planBuilder.js';
import { calcolaDelta } from '../utils/time.js';

const profilo = {
  id: 1,
  nome_profilo: 'Standard',
  ora_sveglia: '07:00',
  ora_colazione: '07:30',
  ora_pranzo: '13:00',
  ora_cena: '20:30',
  ora_sonno: '23:30',
  attivo: 1,
};

function makeFarmaco(overrides = {}) {
  return {
    id: 1,
    nome: 'Test',
    funzione: 'Test',
    tipo_frequenza: 'fisso',
    intervallo_ore: null,
    intervallo_minimo_ore: null,
    dosi_giornaliere: 1,
    relazione_pasto: 'indifferente',
    dettaglio_pasto: null,
    note: null,
    data_inizio: '2024-01-01',
    data_fine: null,
    attivo: 1,
    ...overrides,
  };
}

function makeOrario(farmaco_id, dose_numero, offset_minuti, ancora_riferimento = 'assoluto') {
  return {
    id: farmaco_id * 10 + dose_numero,
    farmaco_id,
    dose_numero,
    offset_minuti,
    ancora_riferimento,
    descrizione_momento: null,
  };
}

const labels = (plan, dateStr) =>
  plan.filter((e) => e.dateStr === dateStr).map((e) => e.ora_prevista);

describe('salto di primavera, 29 marzo 2026', () => {
  const farmaco = makeFarmaco({ dosi_giornaliere: 2 });
  const orari = [makeOrario(1, 1, 150), makeOrario(1, 2, 210)]; // 02:30 e 03:30

  it('la dose delle 02:30 scivola a 03:00 e NON collassa sulla dose delle 03:30', () => {
    const plan = buildMultiDayPlan({
      profilo,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-03-28',
      numDays: 3,
    });
    expect(labels(plan, '2026-03-28')).toEqual(['02:30', '03:30']);
    expect(labels(plan, '2026-03-29')).toEqual(['03:00', '03:30']);
    expect(labels(plan, '2026-03-30')).toEqual(['02:30', '03:30']);
    const scivolata = plan.find((e) => e.key === '2026-03-29-1-1');
    expect(scivolata.orario_non_risolvibile).toBeUndefined();
  });

  it('ramo esteso (48h a giorni civili): la occorrenza che cade il 29 marzo porta la etichetta scivolata', () => {
    const esteso = makeFarmaco({
      id: 2,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 48,
      data_inizio: '2026-03-27',
    });
    const plan = buildMultiDayPlan({
      profilo,
      farmaci: [esteso],
      orari: [makeOrario(2, 1, 150)],
      logAssunzioni: [],
      startDate: '2026-03-28',
      numDays: 3,
    });
    expect(plan.map((e) => [e.dateStr, e.ora_prevista])).toEqual([['2026-03-29', '03:00']]);
  });
});

describe('ritorno di ottobre, 25 ottobre 2026', () => {
  it('la dose delle 02:30 resta 02:30 (prima occorrenza) e una presa alle 03:30 dista 120 minuti reali', () => {
    const plan = buildMultiDayPlan({
      profilo,
      farmaci: [makeFarmaco()],
      orari: [makeOrario(1, 1, 150)],
      logAssunzioni: [],
      startDate: '2026-10-25',
      numDays: 1,
    });
    expect(labels(plan, '2026-10-25')).toEqual(['02:30']);
    expect(
      calcolaDelta({
        dataPrevista: '2026-10-25',
        oraPrevista: plan[0].ora_prevista,
        dataEffettiva: '2026-10-25',
        oraEffettiva: '03:30',
      })
    ).toBe(120);
  });
});
