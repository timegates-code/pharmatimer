// ============================================================
// P20 par.4.8 (s.6.254) -- confine di inizio terapia nel piano.
// par.22.198-duodecies. SENTINEL_P20_PLAN_TESTS
// Casi: esempio ratificato (a) same-day; fallback Dexie (delibera A);
// ramo storico (b); data_inizio futura (c); fisso_date sub-giornaliero;
// ramo extended (filtro dentro computeExtendedOccurrencesInWindow).
// ============================================================
import { describe, it, expect } from 'vitest';
import { buildMultiDayPlan } from './planBuilder.js';
import { computeExtendedOccurrencesInWindow } from './extendedFrequency.js';

const PROFILO = {
  id: 1, nome_profilo: 'Std',
  ora_sveglia: '07:00', ora_colazione: '07:30',
  ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
  attivo: 1,
};

function farmacoFisso(over = {}) {
  return {
    id: 1, nome: 'F', attivo: 1, tipo_frequenza: 'fisso',
    intervallo_ore: null, dosi_giornaliere: 2,
    data_inizio: '2026-07-08', data_fine: null,
    ...over,
  };
}

function orariAbs(farmacoId) {
  return [
    { id: 11, farmaco_id: farmacoId, dose_numero: 1, offset_minuti: 480, ancora_riferimento: 'assoluto' },
    { id: 12, farmaco_id: farmacoId, dose_numero: 2, offset_minuti: 1200, ancora_riferimento: 'assoluto' },
  ];
}

function ctx(farmaci, orari, over = {}) {
  return {
    profilo: PROFILO, farmaci, orari, logAssunzioni: [],
    startDate: '2026-07-08', numDays: 2, ...over,
  };
}

describe('P20 par.4.8 -- buildMultiDayPlan ramo standard', () => {
  it('esempio (a): created_at 12:00 stesso giorno -> 08:00 esclusa, 20:00 inclusa; giorno dopo intero', () => {
    const f = farmacoFisso({ created_at: '2026-07-08T12:00:00' });
    const plan = buildMultiDayPlan(ctx([f], orariAbs(1)));
    const day1 = plan.filter((e) => e.dateStr === '2026-07-08').map((e) => e.ora_prevista);
    const day2 = plan.filter((e) => e.dateStr === '2026-07-09').map((e) => e.ora_prevista);
    expect(day1).toEqual(['20:00']);
    expect(day2).toEqual(['08:00', '20:00']);
  });

  it('fallback Dexie (delibera A): senza created_at il filtro degrada al solo vincolo di data (pre-P20)', () => {
    const f = farmacoFisso();
    const plan = buildMultiDayPlan(ctx([f], orariAbs(1)));
    const day1 = plan.filter((e) => e.dateStr === '2026-07-08').map((e) => e.ora_prevista);
    expect(day1).toEqual(['08:00', '20:00']);
  });

  it('ramo storico (b): data_inizio retro rispetto a created_at -> tutte le dosi dal giorno di inizio', () => {
    const f = farmacoFisso({ data_inizio: '2026-07-06', created_at: '2026-07-08T12:00:00' });
    const plan = buildMultiDayPlan(ctx([f], orariAbs(1), { startDate: '2026-07-06', numDays: 3 }));
    expect(plan.filter((e) => e.dateStr === '2026-07-06')).toHaveLength(2);
    expect(plan.filter((e) => e.dateStr === '2026-07-07')).toHaveLength(2);
    expect(plan.filter((e) => e.dateStr === '2026-07-08')).toHaveLength(2);
  });

  it('data_inizio futura (c): T_inizio = 00:00 di data_inizio, nessuna esclusione aggiuntiva', () => {
    const f = farmacoFisso({ data_inizio: '2026-07-10', created_at: '2026-07-08T12:00:00' });
    const plan = buildMultiDayPlan(ctx([f], orariAbs(1), { startDate: '2026-07-08', numDays: 4 }));
    expect(plan.filter((e) => e.dateStr === '2026-07-09')).toHaveLength(0);
    expect(plan.filter((e) => e.dateStr === '2026-07-10')).toHaveLength(2);
  });

  it('fisso_date: occorrenza del giorno di creazione con orario antecedente e esclusa', () => {
    const f = farmacoFisso({
      tipo_frequenza: 'fisso_date', dosi_giornaliere: 1,
      data_inizio: '2026-07-08', data_fine: '2026-07-09',
      created_at: '2026-07-08T12:00:00',
    });
    const orari = [
      { id: 21, farmaco_id: 1, dose_numero: 1, offset_minuti: 480, ancora_riferimento: 'assoluto', data_specifica: '2026-07-08' },
      { id: 22, farmaco_id: 1, dose_numero: 1, offset_minuti: 480, ancora_riferimento: 'assoluto', data_specifica: '2026-07-09' },
    ];
    const plan = buildMultiDayPlan(ctx([f], orari));
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-07-09']);
  });
});

describe('P20 par.4.8 -- ramo extended (filtro nel punto unico di generazione)', () => {
  const fExt = {
    id: 2, nome: 'Ext', attivo: 1, tipo_frequenza: 'intervallo',
    intervallo_ore: 48, dosi_giornaliere: 1,
    data_inizio: '2026-07-08', data_fine: null,
  };
  const orariExt = [
    { id: 31, farmaco_id: 2, dose_numero: 1, offset_minuti: 480, ancora_riferimento: 'assoluto' },
  ];

  it('ancora del giorno di creazione con orario antecedente -> prima occorrenza slitta di un intervallo', () => {
    const occ = computeExtendedOccurrencesInWindow(
      { ...fExt, created_at: '2026-07-08T12:00:00' }, orariExt, PROFILO, '2026-07-08', 5,
    );
    expect(occ.map((o) => o.dateStr)).toEqual(['2026-07-10', '2026-07-12']);
  });

  it('fallback Dexie: senza created_at ancora inclusa (pre-P20)', () => {
    const occ = computeExtendedOccurrencesInWindow(fExt, orariExt, PROFILO, '2026-07-08', 5);
    expect(occ.map((o) => o.dateStr)).toEqual(['2026-07-08', '2026-07-10', '2026-07-12']);
  });

  it('via buildMultiDayPlan il ramo extended eredita il filtro', () => {
    const plan = buildMultiDayPlan(ctx(
      [{ ...fExt, created_at: '2026-07-08T12:00:00' }], orariExt,
      { startDate: '2026-07-08', numDays: 5 },
    ));
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-07-10', '2026-07-12']);
  });
});
