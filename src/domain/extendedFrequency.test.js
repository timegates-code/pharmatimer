// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  isExtendedInterval,
  computeExtendedOccurrencesInWindow,
} from './extendedFrequency.js';
import { buildMultiDayPlan } from './planBuilder.js';

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

function makeFarmaco(overrides = {}) {
  return {
    id: 1,
    nome: 'Test',
    funzione: 'Test',
    tipo_frequenza: 'intervallo',
    intervallo_ore: 168,
    intervallo_minimo_ore: null,
    dosi_giornaliere: 1,
    relazione_pasto: 'indifferente',
    dettaglio_pasto: null,
    note: null,
    data_inizio: '2026-04-01',
    data_fine: null,
    attivo: 1,
    ...overrides,
  };
}

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

// ---- isExtendedInterval --------------------------------------------------

describe('isExtendedInterval', () => {
  it('returns true for intervallo with intervallo_ore > 24 (e.g. 168h weekly)', () => {
    const f = makeFarmaco({ tipo_frequenza: 'intervallo', intervallo_ore: 168 });
    expect(isExtendedInterval(f)).toBe(true);
  });

  it('returns false at the strict 24h boundary (intervallo_ore === 24)', () => {
    const f = makeFarmaco({ tipo_frequenza: 'intervallo', intervallo_ore: 24 });
    expect(isExtendedInterval(f)).toBe(false);
  });

  it('returns false for tipo_frequenza="fisso" regardless of intervallo_ore', () => {
    const f = makeFarmaco({ tipo_frequenza: 'fisso', intervallo_ore: 168 });
    expect(isExtendedInterval(f)).toBe(false);
  });
});

// ---- computeExtendedOccurrencesInWindow ----------------------------------

describe('computeExtendedOccurrencesInWindow', () => {
  it('168h weekly with anchor before window: computes correct kStart and lands on the right weekday', () => {
    // Anchor: 2026-04-01 (Wed) at 07:30 (colazione).
    // Window: 2026-05-04 (Mon) for 3 days [Mon, Tue, Wed].
    // Expected occurrence: 2026-05-06 (Wed) 07:30 — k = (35 days) / 7 days = 5.
    const farmaco = makeFarmaco({
      intervallo_ore: 168,
      data_inizio: '2026-04-01',
    });
    const orario = makeOrario(farmaco.id, 1, 0, 'colazione');
    const occ = computeExtendedOccurrencesInWindow(
      farmaco,
      [orario],
      profiloStandard,
      '2026-05-04',
      3,
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].dateStr).toBe('2026-05-06');
    expect(occ[0].oraPrevista).toBe('07:30');
    expect(occ[0].orario).toBe(orario);
  });

  it('respects data_fine cutoff (occurrences after data_fine are excluded)', () => {
    // Anchor: 2026-05-04 (Mon) 07:30, intervallo 48h, data_fine 2026-05-07 (Thu).
    // Without cutoff: k=0 May 4, k=1 May 6, k=2 May 8 (out by data_fine).
    // Expected: [May 4, May 6].
    const farmaco = makeFarmaco({
      intervallo_ore: 48,
      data_inizio: '2026-05-04',
      data_fine: '2026-05-07',
    });
    const orario = makeOrario(farmaco.id, 1, 0, 'colazione');
    const occ = computeExtendedOccurrencesInWindow(
      farmaco,
      [orario],
      profiloStandard,
      '2026-05-04',
      7,
    );
    expect(occ.map((o) => o.dateStr)).toEqual(['2026-05-04', '2026-05-06']);
  });
});

// ---- planBuilder integration --------------------------------------------

describe('buildMultiDayPlan extended branch integration', () => {
  it('mixes standard daily entries with extended weekly entries without altering the standard path', () => {
    // Standard farmaco: tipo='fisso', 1 dose/day at colazione = 07:30.
    const standard = makeFarmaco({
      id: 10,
      nome: 'Pantorc 40mg',
      tipo_frequenza: 'fisso',
      intervallo_ore: null,
      data_inizio: '2024-01-01',
    });
    const standardOrario = makeOrario(10, 1, 0, 'colazione');

    // Extended farmaco: 168h weekly, anchor 2026-04-01 (Wed) 07:30.
    const extended = makeFarmaco({
      id: 20,
      nome: 'Metotrexato',
      tipo_frequenza: 'intervallo',
      intervallo_ore: 168,
      data_inizio: '2026-04-01',
    });
    const extendedOrario = makeOrario(20, 1, 0, 'colazione');

    // Window: 2026-05-04 (Mon) for 3 days [Mon, Tue, Wed].
    const plan = buildMultiDayPlan({
      profilo: profiloStandard,
      farmaci: [standard, extended],
      orari: [standardOrario, extendedOrario],
      logAssunzioni: [],
      startDate: '2026-05-04',
      numDays: 3,
    });

    // Standard: 3 entries (Mon/Tue/Wed). Extended: 1 entry on Wed (k=5).
    const standardEntries = plan.filter((e) => e.farmaco.id === 10);
    const extendedEntries = plan.filter((e) => e.farmaco.id === 20);

    expect(standardEntries.map((e) => e.dateStr)).toEqual([
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
    ]);
    standardEntries.forEach((e) => expect(e.ora_prevista).toBe('07:30'));

    expect(extendedEntries).toHaveLength(1);
    expect(extendedEntries[0].dateStr).toBe('2026-05-06');
    expect(extendedEntries[0].ora_prevista).toBe('07:30');
    expect(extendedEntries[0].stato).toBe('prevista');
    expect(extendedEntries[0].key).toBe('2026-05-06-20-1');
  });
});


// ---- CP9 §6.187 EXT.4 — applyAssunzione gap_recovery prompt gate --------

import { applyAssunzione } from './recalc.js';

describe('applyAssunzione gap_recovery prompt gate (CP9 §6.187 EXT.4)', () => {
  it('does NOT emit gap_recovery prompt for extended-frequency farmaco even when newGap exceeds SOGLIA', () => {
    // Setup: 168h farmaco, gap_minuti pre-presa = 200 (well above
    // SOGLIA_PROMPT_RECUPERO=30). delta = 0 -> newGap = 200 -> would
    // normally emit gap_recovery prompt for a standard-interval farmaco.
    // CP9 §6.187 EXT.4: extended-frequency -> prompt suppressed.
    const farmaco = makeFarmaco({
      id: 99,
      intervallo_ore: 168,
      data_inizio: '2026-04-01',
    });
    const orario = makeOrario(99, 1, 0, 'colazione');

    // Two-entry plan: target with gap=200, next dose 7 days later.
    const plan = [
      {
        key: '2026-04-08-99-1', dateStr: '2026-04-08', farmaco, orario,
        ora_prevista: '07:30', ora_ricalcolata: null, ora_ricalcolata_originale: null,
        ora_effettiva: null, delta_minuti: null,
        gap_minuti: 200, gap_originale: 200, recupero_minuti: 0,
        stato: 'prevista', dose_prec_saltata: false,
      },
      {
        key: '2026-04-15-99-1', dateStr: '2026-04-15', farmaco, orario,
        ora_prevista: '07:30', ora_ricalcolata: null, ora_ricalcolata_originale: null,
        ora_effettiva: null, delta_minuti: null,
        gap_minuti: 0, gap_originale: 0, recupero_minuti: 0,
        stato: 'prevista', dose_prec_saltata: false,
      },
    ];

    const result = applyAssunzione(plan, {
      entryKey: '2026-04-08-99-1',
      dataEffettiva: '2026-04-08',
      oraEffettiva: '07:30',
    });

    // Sanity: recalculation chain still runs. Only the prompt is suppressed.
    expect(result.prompt).toBeNull();
    const nextEntry = result.plan.find((e) => e.key === '2026-04-15-99-1');
    expect(nextEntry.stato).toBe('ricalcolata');
    expect(nextEntry.gap_minuti).toBe(200);
  });
});
