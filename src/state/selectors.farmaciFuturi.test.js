import { describe, it, expect } from 'vitest';
import { selectFarmaciConDataInizioFutura } from './selectors.js';

function makeFarmaco({ id, nome, attivo = true, data_inizio, data_fine = null }) {
  return { id, nome, attivo, data_inizio, data_fine };
}

describe('selectFarmaciConDataInizioFutura (§6.207 AMB-10.F÷I)', () => {
  it('F1: single farmaco with future data_inizio', () => {
    const state = {
      farmaci: [makeFarmaco({ id: 1, nome: 'Antibiotico', data_inizio: '2026-05-15' })],
    };
    const result = selectFarmaciConDataInizioFutura(state, '2026-05-13');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      data_inizio: '2026-05-15',
      farmaci: [expect.objectContaining({ nome: 'Antibiotico' })],
    });
  });

  it('F2: multiple farmaci same data_inizio sorted alphabetically (it-IT)', () => {
    const state = {
      farmaci: [
        makeFarmaco({ id: 1, nome: 'Vitamina D', data_inizio: '2026-05-15' }),
        makeFarmaco({ id: 2, nome: 'Antibiotico', data_inizio: '2026-05-15' }),
      ],
    };
    const result = selectFarmaciConDataInizioFutura(state, '2026-05-13');
    expect(result).toHaveLength(1);
    expect(result[0].farmaci.map((f) => f.nome)).toEqual(['Antibiotico', 'Vitamina D']);
  });

  it('F3: multiple data_inizio sorted ASC', () => {
    const state = {
      farmaci: [
        makeFarmaco({ id: 1, nome: 'B-later', data_inizio: '2026-05-20' }),
        makeFarmaco({ id: 2, nome: 'A-earlier', data_inizio: '2026-05-15' }),
      ],
    };
    const result = selectFarmaciConDataInizioFutura(state, '2026-05-13');
    expect(result.map((g) => g.data_inizio)).toEqual(['2026-05-15', '2026-05-20']);
  });

  it('F4+F5: filters inactive + data_inizio===today (parity §6.188)', () => {
    // F4: attivo=false escluso; F5: data_inizio===today escluso (gia nel plan)
    const state = {
      farmaci: [
        makeFarmaco({ id: 1, nome: 'Inactive', attivo: false, data_inizio: '2026-05-15' }),
        makeFarmaco({ id: 2, nome: 'TodayStart', data_inizio: '2026-05-13' }),
        makeFarmaco({ id: 3, nome: 'Future', data_inizio: '2026-05-15' }),
      ],
    };
    const result = selectFarmaciConDataInizioFutura(state, '2026-05-13');
    expect(result).toHaveLength(1);
    expect(result[0].farmaci.map((f) => f.nome)).toEqual(['Future']);
  });
});
