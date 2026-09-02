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

// ============================================================
// CP3 §6.115b — mergeLogIntoEntry invariante ISO opaque (Sessione 9-A)
// ============================================================

describe('CP3 §6.115b — mergeLogIntoEntry invariante ora_ricalcolata ISO opaque', () => {
  it('dovrebbe preservare la stringa ISO ora_ricalcolata cross-midnight dal log alla entry (§6.23 esteso)', () => {
    // mergeLogIntoEntry e' opaque su ora_ricalcolata: copia la stringa as-is.
    // Verifichiamo che un log con ora_ricalcolata ISO cross-midnight 2026-04-27T07:00
    // venga riportato byte-identical sulla entry generata da buildMultiDayPlan.
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 1,
    });
    const orari = [makeOrario(1, 1, 0, 'cena')]; // 20:30 std
    const logAssunzioni = [
      {
        farmaco_id: 1,
        data: '2026-04-26',
        dose_numero: 1,
        ora_prevista: '20:30',
        ora_effettiva: null,
        delta_minuti: null,
        ora_ricalcolata: '2026-04-27T07:00', // ISO cross-midnight
        gap_minuti: 60,
        recupero_minuti: 0,
        stato: 'ricalcolata',
        note: null,
      },
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni,
      startDate: '2026-04-26',
      numDays: 2,
    };
    const plan = buildMultiDayPlan(ctx);
    const merged = plan.find(
      (e) => e.farmaco.id === 1 && e.orario.dose_numero === 1 && e.dateStr === '2026-04-26'
    );
    expect(merged.stato).toBe('ricalcolata');
    expect(merged.ora_ricalcolata).toBe('2026-04-27T07:00'); // byte-identical
    expect(merged.gap_minuti).toBe(60);
    // dateStr della entry resta 2026-04-26 (entry pre-allocata): cross-midnight si manifesta
    // solo nella stringa ora_ricalcolata, non nel dateStr.
    expect(merged.dateStr).toBe('2026-04-26');
  });

  it('round-trip: log scritto in formato ISO cross-midnight viene riletto invariato dopo buildMultiDayPlan', () => {
    // Verifica end-to-end: log creato con stringa ISO 2026-04-27T05:30 sopravvive a un ciclo
    // completo di build del piano e mantiene il valore esatto.
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 1,
    });
    const orari = [makeOrario(1, 1, 0, 'cena')]; // 20:30 std
    const isoRicalc = '2026-04-27T05:30';
    const logAssunzioni = [
      {
        farmaco_id: 1,
        data: '2026-04-26',
        dose_numero: 1,
        ora_prevista: '20:30',
        ora_effettiva: null,
        delta_minuti: null,
        ora_ricalcolata: isoRicalc,
        gap_minuti: 30,
        recupero_minuti: 0,
        stato: 'ricalcolata',
        note: null,
      },
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni,
      startDate: '2026-04-26',
      numDays: 1,
    };
    // First build
    const plan1 = buildMultiDayPlan(ctx);
    const merged1 = plan1.find((e) => e.dateStr === '2026-04-26');
    expect(merged1.ora_ricalcolata).toBe(isoRicalc);
    // Second build (idempotency)
    const plan2 = buildMultiDayPlan(ctx);
    const merged2 = plan2.find((e) => e.dateStr === '2026-04-26');
    expect(merged2.ora_ricalcolata).toBe(isoRicalc);
    expect(merged2.ora_ricalcolata).toBe(merged1.ora_ricalcolata);
  });
});


// ============================================================
// F14 Blocco 2 (par.22.150) — fisso_date / lista piatta
// Predicato per-data in buildMultiDayPlan (ramo standard). Modello LISTA PIATTA:
// coppie (data, ora) arbitrarie, NON Pattern S. Il dominio filtra solo per data.
// ============================================================

describe('F14 fisso_date — lista piatta (predicato per-data)', () => {
  // Helper locale: orario assoluto con data_specifica (occorrenza singola).
  function makeOrarioDatato(farmaco_id, dose_numero, offset_minuti, data_specifica) {
    return {
      ...makeOrario(farmaco_id, dose_numero, offset_minuti, 'assoluto'),
      data_specifica,
    };
  }

  it('A — puntuale: materializza solo nelle date valorizzate (25 e 27), nulla nei giorni vuoti', () => {
    const farmaco = makeFarmaco({
      id: 50,
      nome: 'Vitamina D',
      tipo_frequenza: 'fisso_date',
      dosi_giornaliere: 1,
      data_inizio: '2026-06-25',
      data_fine: '2026-06-27',
    });
    const orari = [
      makeOrarioDatato(50, 1, 480, '2026-06-25'), // 08:00 il 25
      makeOrarioDatato(50, 1, 540, '2026-06-27'), // 09:00 il 27
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-06-24',
      numDays: 8, // 24 giu .. 1 lug
    };
    const plan = buildMultiDayPlan(ctx);
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-06-25', '2026-06-27']);
    expect(plan.find((e) => e.dateStr === '2026-06-26')).toBeUndefined();
    expect(plan).toHaveLength(2);
    expect(plan[0].ora_prevista).toBe('08:00');
    expect(plan[1].ora_prevista).toBe('09:00');
  });

  it('B — due dosi sulla stessa data (08:00 + 20:00): entrambe, ordinate', () => {
    const farmaco = makeFarmaco({
      id: 51,
      tipo_frequenza: 'fisso_date',
      dosi_giornaliere: 2,
      data_inizio: '2026-06-25',
      data_fine: '2026-06-25',
    });
    const orari = [
      makeOrarioDatato(51, 1, 480, '2026-06-25'),  // 08:00
      makeOrarioDatato(51, 2, 1200, '2026-06-25'), // 20:00
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-06-25',
      numDays: 1,
    };
    const plan = buildMultiDayPlan(ctx);
    expect(plan).toHaveLength(2);
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-06-25', '2026-06-25']);
    expect(plan.map((e) => e.ora_prevista)).toEqual(['08:00', '20:00']);
  });

  it('C — regressione: data_specifica esplicitamente null = riga ricorrente (ogni giorno)', () => {
    const farmaco = makeFarmaco({ id: 52, tipo_frequenza: 'fisso', dosi_giornaliere: 1 });
    const orari = [
      { ...makeOrario(52, 1, 0, 'colazione'), data_specifica: null }, // 07:30 std
    ];
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-06-25',
      numDays: 3,
    };
    const plan = buildMultiDayPlan(ctx);
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-06-25', '2026-06-26', '2026-06-27']);
    expect(plan.every((e) => e.ora_prevista === '07:30')).toBe(true);
  });

  it('D — locale: campo data_specifica ASSENTE (undefined) = riga ricorrente (ogni giorno)', () => {
    const farmaco = makeFarmaco({ id: 53, tipo_frequenza: 'fisso', dosi_giornaliere: 1 });
    const orari = [makeOrario(53, 1, 0, 'colazione')]; // nessun campo data_specifica
    const ctx = {
      profilo: profiloStandard,
      farmaci: [farmaco],
      orari,
      logAssunzioni: [],
      startDate: '2026-06-25',
      numDays: 3,
    };
    const plan = buildMultiDayPlan(ctx);
    expect(plan).toHaveLength(3);
    expect(plan.map((e) => e.dateStr)).toEqual(['2026-06-25', '2026-06-26', '2026-06-27']);
  });
});

// ============================================================
// P3 -- contenimento PER SINGOLA DOSE di ORARIO_NON_RISOLVIBILE (decisione 1).
// Ratificato: se il resolver lancia per una voce, quella voce compare nel
// piano come "orario non risolvibile" e le altre dosi del giorno restano; il
// piano intero non sparisce mai per un errore su una voce.
// ============================================================
describe('P3 -- contenimento per singola dose (ORARIO_NON_RISOLVIBILE)', () => {
  const profiloSenzaCena = { ...profiloStandard, ora_cena: undefined };
  const farmacoA = makeFarmaco({ id: 1, nome: 'A ancora cena' });
  const farmacoB = makeFarmaco({ id: 2, nome: 'B ancora colazione' });
  const orari = [makeOrario(1, 1, 0, 'cena'), makeOrario(2, 1, 0, 'colazione')];

  it('profilo senza ancora, due farmaci: il piano mostra lo altro, e la dose orfana resta visibile senza orario', () => {
    const plan = buildMultiDayPlan({
      profilo: profiloSenzaCena,
      farmaci: [farmacoA, farmacoB],
      orari,
      logAssunzioni: [],
      startDate: '2026-07-15',
      numDays: 1,
    });
    expect(plan).toHaveLength(2);
    const b = plan.find((e) => e.farmaco.id === 2);
    expect(b.ora_prevista).toBe('07:30');
    expect(b.orario_non_risolvibile).toBeUndefined();
    const a = plan.find((e) => e.farmaco.id === 1);
    expect(a.ora_prevista).toBeNull();
    expect(a.orario_non_risolvibile).toBe(true);
    expect(a.stato).toBe('prevista');
    // La dose senza orario ordina ULTIMA nel giorno, e lo ordinamento non lancia.
    expect(plan[0]).toBe(b);
    expect(plan[1]).toBe(a);
  });

  it('la dose senza orario non viene nascosta dal confine T_inizio, la dose collocata si', () => {
    // Inserimento a meta giornata: T_inizio = created_at 12:00. La dose B
    // delle 07:30 e prima del confine ed e esclusa (P20); la dose A non ha
    // un orario da confrontare e resta visibile (fail-safe: assenza di
    // informazione non nasconde).
    const inseritiOggi = [
      { ...farmacoA, data_inizio: '2026-07-15', created_at: '2026-07-15T12:00:00' },
      { ...farmacoB, data_inizio: '2026-07-15', created_at: '2026-07-15T12:00:00' },
    ];
    const plan = buildMultiDayPlan({
      profilo: profiloSenzaCena,
      farmaci: inseritiOggi,
      orari,
      logAssunzioni: [],
      startDate: '2026-07-15',
      numDays: 1,
    });
    expect(plan.map((e) => [e.farmaco.id, e.ora_prevista])).toEqual([[1, null]]);
  });

  it('un registro gia scritto sulla dose orfana viene fuso come per ogni altra voce', () => {
    const plan = buildMultiDayPlan({
      profilo: profiloSenzaCena,
      farmaci: [farmacoA],
      orari: [orari[0]],
      logAssunzioni: [
        {
          farmaco_id: 1, data: '2026-07-15', dose_numero: 1, ora_prevista: '20:00',
          ora_effettiva: '2026-07-15T20:05:00', delta_minuti: 5, ora_ricalcolata: null,
          gap_minuti: 0, recupero_minuti: 0, stato: 'presa', note: null,
        },
      ],
      startDate: '2026-07-15',
      numDays: 1,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].stato).toBe('presa');
    expect(plan[0].ora_effettiva).toBe('2026-07-15T20:05:00');
    expect(plan[0].ora_prevista).toBeNull();
    expect(plan[0].orario_non_risolvibile).toBe(true);
  });

  it('ramo esteso: un farmaco ogni 48h con ancora mancante resta nel piano, senza orario', () => {
    const esteso = makeFarmaco({
      id: 3, nome: 'Esteso', tipo_frequenza: 'intervallo', intervallo_ore: 48,
      data_inizio: '2026-07-13',
    });
    const plan = buildMultiDayPlan({
      profilo: profiloSenzaCena,
      farmaci: [esteso, farmacoB],
      orari: [makeOrario(3, 1, 0, 'cena'), orari[1]],
      logAssunzioni: [],
      startDate: '2026-07-15',
      numDays: 2,
    });
    expect(plan.map((e) => [e.dateStr, e.farmaco.id, e.ora_prevista])).toEqual([
      ['2026-07-15', 2, '07:30'],
      ['2026-07-15', 3, null],
      ['2026-07-16', 2, '07:30'],
    ]);
    expect(plan[1].orario_non_risolvibile).toBe(true);
  });
});
