// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildMultiDayPlan, computeOraPrevista } from './planBuilder.js';

// ---- Fixtures ------------------------------------------------------------

const profiloStandard = {
  id: 1,
  nome_profilo: 'Standard',
  ora_sveglia: '07:00',
  ora_colazione: '07:30',
  ora_pranzo: '13:00',
  ora_cena: '20:30',
  ora_sonno: '23:30',
  attivo: 1,
};

const profiloNottambulo = {
  id: 2,
  nome_profilo: 'Nottambulo',
  ora_sveglia: '10:00',
  ora_colazione: '10:30',
  ora_pranzo: '14:30',
  ora_cena: '21:30',
  ora_sonno: '02:00',
  attivo: 0,
};

// Helper: builds a fresh farmaco with sensible defaults.
function makeFarmaco(overrides = {}) {
  return {
    id: 1,
    nome: 'Test 100mg',
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

// Helper: builds an orario_base row.
function makeOrario(farmaco_id, dose_numero, offset_minuti, ancora_riferimento = 'colazione') {
  return {
    id: farmaco_id * 10 + dose_numero,
    farmaco_id,
    dose_numero,
    offset_minuti,
    ancora_riferimento,
    descrizione_momento: null,
  };
}

// ---- computeOraPrevista --------------------------------------------------

describe('computeOraPrevista', () => {
  it('dovrebbe ritornare "07:00" per ancora colazione offset -30 con profilo Standard', () => {
    const orario = makeOrario(1, 1, -30, 'colazione');
    expect(computeOraPrevista(orario, profiloStandard)).toBe('07:00');
  });

  it('dovrebbe ritornare "10:00" per ancora colazione offset -30 con profilo Nottambulo', () => {
    const orario = makeOrario(1, 1, -30, 'colazione');
    expect(computeOraPrevista(orario, profiloNottambulo)).toBe('10:00');
  });

  it('dovrebbe ritornare "08:30" per ancora assoluto offset 510', () => {
    const orario = makeOrario(1, 1, 510, 'assoluto');
    expect(computeOraPrevista(orario, profiloStandard)).toBe('08:30');
  });

  it('dovrebbe ritornare "00:00" per ancora assoluto offset 0', () => {
    const orario = makeOrario(1, 1, 0, 'assoluto');
    expect(computeOraPrevista(orario, profiloStandard)).toBe('00:00');
  });
});

// ---- buildMultiDayPlan — scope temporale ---------------------------------

describe('buildMultiDayPlan — scope temporale (data_inizio / data_fine)', () => {
  it('dovrebbe includere il farmaco solo nelle date comprese nel suo range', () => {
    const farmaco = makeFarmaco({
      id: 99,
      data_inizio: '2026-04-16',
      data_fine: '2026-04-18',
    });
    const orari = [makeOrario(99, 1, 0, 'colazione')];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-04-15',
      numDays: 5,
    };
    const plan = buildMultiDayPlan(ctx);
    const dates = plan.map((e) => e.dateStr);
    expect(dates).toEqual(['2026-04-16', '2026-04-17', '2026-04-18']);
  });
});

// ---- buildMultiDayPlan — ordinamento -------------------------------------

describe('buildMultiDayPlan — ordinamento', () => {
  it('dovrebbe ordinare per (dateStr ASC, ora_prevista ASC)', () => {
    // 3 farmaci a orari diversi, stesso giorno.
    const fCena = makeFarmaco({ id: 1, nome: 'Cena med' });     // 20:30
    const fColaz = makeFarmaco({ id: 2, nome: 'Colaz med' });    // 07:30
    const fPranzo = makeFarmaco({ id: 3, nome: 'Pranzo med' });  // 13:00
    const orari = [
      makeOrario(1, 1, 0, 'cena'),
      makeOrario(2, 1, 0, 'colazione'),
      makeOrario(3, 1, 0, 'pranzo'),
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [fCena, fColaz, fPranzo],
      orari,
      logAssunzioni: [],
      startDate: '2026-04-16',
      numDays: 2,
    };
    const plan = buildMultiDayPlan(ctx);
    const day1 = plan.filter((e) => e.dateStr === '2026-04-16');
    expect(day1.map((e) => e.ora_prevista)).toEqual(['07:30', '13:00', '20:30']);
    // And cross-day: all day1 entries precede all day2 entries.
    const firstDay2Index = plan.findIndex((e) => e.dateStr === '2026-04-17');
    const lastDay1Index = plan.map((e) => e.dateStr).lastIndexOf('2026-04-16');
    expect(lastDay1Index).toBeLessThan(firstDay2Index);
  });
});

// ---- buildMultiDayPlan — merge con log_assunzioni ------------------------

describe('buildMultiDayPlan — merge con log_assunzioni', () => {
  it('dovrebbe applicare il log alla entry corrispondente e lasciare le altre in prevista', () => {
    const farmaco1 = makeFarmaco({ id: 1, dosi_giornaliere: 2 });
    const farmaco2 = makeFarmaco({ id: 2 });
    const orari = [
      makeOrario(1, 1, 0, 'colazione'),  // 07:30
      makeOrario(1, 2, 0, 'cena'),       // 20:30
      makeOrario(2, 1, 0, 'colazione'),  // 07:30
    ];
    const logAssunzioni = [
      {
        farmaco_id: 1,
        data: '2026-04-16',
        dose_numero: 1,
        ora_prevista: '07:30',
        ora_effettiva: '2026-04-16T07:05:00',
        delta_minuti: 5,
        ora_ricalcolata: null,
        gap_minuti: 0,
        recupero_minuti: 0,
        stato: 'presa',
        note: null,
      },
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco1, farmaco2],
      orari,
      logAssunzioni,
      startDate: '2026-04-16',
      numDays: 1,
    };
    const plan = buildMultiDayPlan(ctx);
    const merged = plan.find(
      (e) => e.farmaco.id === 1 && e.orario.dose_numero === 1 && e.dateStr === '2026-04-16'
    );
    expect(merged.stato).toBe('presa');
    expect(merged.ora_effettiva).toBe('2026-04-16T07:05:00');
    expect(merged.delta_minuti).toBe(5);

    // Other entries untouched.
    const other1 = plan.find(
      (e) => e.farmaco.id === 1 && e.orario.dose_numero === 2 && e.dateStr === '2026-04-16'
    );
    const other2 = plan.find(
      (e) => e.farmaco.id === 2 && e.orario.dose_numero === 1 && e.dateStr === '2026-04-16'
    );
    expect(other1.stato).toBe('prevista');
    expect(other1.ora_effettiva).toBe(null);
    expect(other1.delta_minuti).toBe(null);
    expect(other2.stato).toBe('prevista');
    expect(other2.ora_effettiva).toBe(null);
    expect(other2.delta_minuti).toBe(null);
  });

  it('dovrebbe lasciare tutte le entries in prevista con log vuoto', () => {
    const farmaco = makeFarmaco({ id: 1 });
    const orari = [makeOrario(1, 1, 0, 'colazione')];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-04-16',
      numDays: 1,
    };
    const plan = buildMultiDayPlan(ctx);
    expect(plan).toHaveLength(1);
    expect(plan[0].stato).toBe('prevista');
    expect(plan[0].ora_effettiva).toBe(null);
    expect(plan[0].delta_minuti).toBe(null);
  });

  it('dovrebbe ignorare silenziosamente log orfani (farmaco disattivo in quella data)', () => {
    // Farmaco 1 attivo solo dal 2026-04-17. Il log punta al 2026-04-16 (prima del range).
    const farmaco = makeFarmaco({
      id: 1,
      data_inizio: '2026-04-17',
      data_fine: null,
    });
    const orari = [makeOrario(1, 1, 0, 'colazione')];
    const logAssunzioni = [
      {
        farmaco_id: 1,
        data: '2026-04-16',
        dose_numero: 1,
        ora_prevista: '07:30',
        ora_effettiva: '2026-04-16T07:05:00',
        delta_minuti: 5,
        ora_ricalcolata: null,
        gap_minuti: 0,
        recupero_minuti: 0,
        stato: 'presa',
        note: null,
      },
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni,
      startDate: '2026-04-16',
      numDays: 3,
    };
    const plan = buildMultiDayPlan(ctx);
    // Only 2026-04-17 and 2026-04-18 (farmaco active from 17).
    const dates = plan.map((e) => e.dateStr);
    expect(dates).toEqual(['2026-04-17', '2026-04-18']);
    // No phantom entry on 2026-04-16.
    expect(plan.find((e) => e.dateStr === '2026-04-16')).toBeUndefined();
    // Both surviving entries are 'prevista'.
    expect(plan.every((e) => e.stato === 'prevista')).toBe(true);
  });
});
