// @vitest-environment node
// ============================================================
// DST nel ricalcolo (decisione 1, ibrido dichiarato).
//
//   - il ricalcolo della dose successiva e aritmetica di PARETE: presa alle
//     23:00 piu 8 ore da 07:00 su entrambe le notti, che sono 7 ore reali il
//     29 marzo e 9 il 25 ottobre. La guardia sui minuti reali e del server
//     (decisione 2), non di questo file: qui la conseguenza si DICHIARA.
//   - il delta e in minuti REALI, e la dose scivolata si misura dal primo
//     istante esistente.
//   - ricalcolaPianoDaProfilo risolve la etichetta sul giorno della voce.
// Ogni test asserisce un fatto falso senza ora legale (`make controllo-dst`).
// ============================================================
import { describe, it, expect } from 'vitest';
import { buildMultiDayPlan } from './planBuilder.js';
import { applyAssunzione, ricalcolaPianoDaProfilo } from './recalc.js';
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

const farmacoOgni8 = {
  id: 1,
  nome: 'Ogni 8',
  funzione: 'Test',
  tipo_frequenza: 'intervallo',
  intervallo_ore: 8,
  intervallo_minimo_ore: 4,
  dosi_giornaliere: 2,
  relazione_pasto: 'indifferente',
  dettaglio_pasto: null,
  note: null,
  data_inizio: '2024-01-01',
  data_fine: null,
  attivo: 1,
};

const orario = (dose_numero, offset_minuti) => ({
  id: 10 + dose_numero,
  farmaco_id: 1,
  dose_numero,
  offset_minuti,
  ancora_riferimento: 'assoluto',
  descrizione_momento: null,
});

const orariDue = [orario(1, 900), orario(2, 1380)]; // 15:00 e 23:00

function pianoDa(startDate, numDays, orari = orariDue, farmaco = farmacoOgni8) {
  return buildMultiDayPlan({
    profilo,
    farmaci: [farmaco],
    orari,
    logAssunzioni: [],
    startDate,
    numDays,
  });
}

describe('ricalcolo attraverso la transizione: parete, con i minuti reali dichiarati', () => {
  it('29 marzo: presa alle 23:00, dose successiva alle 07:00 di parete, 420 minuti reali', () => {
    const plan = pianoDa('2026-03-28', 2);
    const { plan: dopo } = applyAssunzione(plan, {
      entryKey: '2026-03-28-1-2',
      dataEffettiva: '2026-03-28',
      oraEffettiva: '23:00',
    });
    const successiva = dopo.find((e) => e.key === '2026-03-29-1-1');
    expect(successiva.stato).toBe('ricalcolata');
    expect(successiva.ora_ricalcolata).toBe('2026-03-29T07:00');
    expect(
      calcolaDelta({
        dataPrevista: '2026-03-28',
        oraPrevista: '23:00',
        dataEffettiva: '2026-03-29',
        oraEffettiva: '07:00',
      })
    ).toBe(420);
  });

  it('25 ottobre: presa alle 23:00, dose successiva alle 07:00 di parete, 540 minuti reali', () => {
    const plan = pianoDa('2026-10-24', 2);
    const { plan: dopo } = applyAssunzione(plan, {
      entryKey: '2026-10-24-1-2',
      dataEffettiva: '2026-10-24',
      oraEffettiva: '23:00',
    });
    const successiva = dopo.find((e) => e.key === '2026-10-25-1-1');
    expect(successiva.ora_ricalcolata).toBe('2026-10-25T07:00');
    expect(
      calcolaDelta({
        dataPrevista: '2026-10-24',
        oraPrevista: '23:00',
        dataEffettiva: '2026-10-25',
        oraEffettiva: '07:00',
      })
    ).toBe(540);
  });
});

describe('delta sulla dose scivolata, 29 marzo', () => {
  const orariNotte = [orario(1, 150), orario(2, 630)]; // 02:30 (scivola a 03:00) e 10:30

  it('presa alle 03:00 vale 0, presa alle 03:30 vale +30', () => {
    const plan = pianoDa('2026-03-29', 1, orariNotte);
    expect(plan[0].ora_prevista).toBe('03:00');
    const alle3 = applyAssunzione(plan, {
      entryKey: '2026-03-29-1-1',
      dataEffettiva: '2026-03-29',
      oraEffettiva: '03:00',
    });
    expect(alle3.plan[0].delta_minuti).toBe(0);
    const alle330 = applyAssunzione(plan, {
      entryKey: '2026-03-29-1-1',
      dataEffettiva: '2026-03-29',
      oraEffettiva: '03:30',
    });
    expect(alle330.plan[0].delta_minuti).toBe(30);
  });
});

describe('ricalcolaPianoDaProfilo risolve sul giorno della voce', () => {
  it('un profilo con colazione alle 02:30 etichetta la dose del 29 marzo a 03:00 e quella del 28 a 02:30', () => {
    const orarioColazione = [
      { ...orario(1, 0), ancora_riferimento: 'colazione' },
    ];
    const farmacoFisso = { ...farmacoOgni8, tipo_frequenza: 'fisso', intervallo_ore: null, intervallo_minimo_ore: null, dosi_giornaliere: 1 };
    const plan = pianoDa('2026-03-28', 2, orarioColazione, farmacoFisso);
    expect(plan.map((e) => e.ora_prevista)).toEqual(['07:30', '07:30']);
    const nottambulo = { ...profilo, ora_colazione: '02:30' };
    const dopo = ricalcolaPianoDaProfilo(plan, nottambulo);
    expect(dopo.map((e) => [e.dateStr, e.ora_prevista])).toEqual([
      ['2026-03-28', '02:30'],
      ['2026-03-29', '03:00'],
    ]);
  });
});
