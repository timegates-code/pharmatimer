// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcolaRecuperoMax,
  applySospensione,
  applySalto,
  applyAssunzione,
  applyRecupero,
  annullaAssunzione,
  ricalcolaPianoDaProfilo,
  applyRipristino,
} from './recalc.js';
import { DomainError } from './errors.js';

// ============================================================
// FIXTURES
// ============================================================

/**
 * Build a Farmaco with sensible defaults. Override as needed per test.
 */
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

/**
 * Build an OrarioBase with defaults.
 */
function makeOrario(farmaco_id, dose_numero, offset_minuti = 0, ancora = 'colazione') {
  return {
    id: farmaco_id * 10 + dose_numero,
    farmaco_id,
    dose_numero,
    offset_minuti,
    ancora_riferimento: ancora,
    descrizione_momento: null,
  };
}

/**
 * Build a PlanEntry directly without going through buildMultiDayPlan.
 * Useful for unit-testing recalc in isolation.
 */
function makeEntry(farmaco, orario, dateStr, ora_prevista, overrides = {}) {
  return {
    key: `${dateStr}-${farmaco.id}-${orario.dose_numero}`,
    dateStr,
    farmaco,
    orario,
    ora_prevista,
    ora_ricalcolata: null,
    ora_ricalcolata_originale: null,
    ora_effettiva: null,
    delta_minuti: null,
    gap_minuti: 0,
    gap_originale: 0,
    recupero_minuti: 0,
    stato: 'prevista',
    dose_prec_saltata: false,
    ...overrides,
  };
}

// ============================================================
// T12 — calcolaRecuperoMax
// ============================================================

describe('T12 — calcolaRecuperoMax', () => {
  it('dovrebbe ritornare 0 per gap 0', () => {
    const f = makeFarmaco();
    expect(calcolaRecuperoMax(f, 0)).toBe(0);
  });

  it('dovrebbe ritornare il gap intero se il farmaco non ha intervallo_minimo_ore', () => {
    const f = makeFarmaco({ intervallo_ore: 8, intervallo_minimo_ore: null });
    expect(calcolaRecuperoMax(f, 60)).toBe(60);
  });

  it('dovrebbe ritornare il gap quando gap < safety (gap=120, safety=240)', () => {
    const f = makeFarmaco({
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
    });
    expect(calcolaRecuperoMax(f, 120)).toBe(120);
  });

  it('dovrebbe ritornare safety quando gap > safety (gap=300, safety=240)', () => {
    const f = makeFarmaco({
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
    });
    expect(calcolaRecuperoMax(f, 300)).toBe(240);
  });

  it('dovrebbe ritornare 0 per gap negativo (anticipo residuo)', () => {
    const f = makeFarmaco({ intervallo_ore: 8, intervallo_minimo_ore: 4 });
    expect(calcolaRecuperoMax(f, -30)).toBe(0);
  });
});

// ============================================================
// T09 — applySospensione non propaga nulla
// ============================================================

describe('T09 — applySospensione', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00');
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    plan = [entry1, entry2];
  });

  it('dovrebbe marcare la dose come sospesa', () => {
    const result = applySospensione(plan, entry1.key);
    const updated = result.plan.find((e) => e.key === entry1.key);
    expect(updated.stato).toBe('sospesa');
  });

  it('dovrebbe lasciare la dose successiva invariata', () => {
    const result = applySospensione(plan, entry1.key);
    const next = result.plan.find((e) => e.key === entry2.key);
    expect(next.stato).toBe('prevista');
    expect(next.gap_minuti).toBe(0);
    expect(next.dose_prec_saltata).toBe(false);
  });

  it('dovrebbe produrre 1 logWrite (solo target) e nessun prompt', () => {
    const result = applySospensione(plan, entry1.key);
    expect(result.logWrites).toHaveLength(1);
    expect(result.logWrites[0].stato).toBe('sospesa');
    expect(result.logWrites[0].farmaco_id).toBe(1);
    expect(result.logWrites[0].dose_numero).toBe(1);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// T07 — applySalto intervallo pass-through gap
// ============================================================

describe('T07 — applySalto farmaco a intervallo (pass-through gap)', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    // Dose 1 ALREADY recalculated to 17:00 with gap_minuti=60 (scenario:
    // the preceding dose was taken late and propagated the gap here).
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '17:00',
      ora_ricalcolata_originale: '17:00',
      gap_minuti: 60,
      gap_originale: 60,
    });
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    plan = [entry1, entry2];
  });

  it('dovrebbe marcare la dose target come saltata', () => {
    const result = applySalto(plan, entry1.key);
    const updated = result.plan.find((e) => e.key === entry1.key);
    expect(updated.stato).toBe('saltata');
  });

  it('dovrebbe propagare il gap esistente INVARIATO alla dose N+1 (pass-through)', () => {
    const result = applySalto(plan, entry1.key);
    const next = result.plan.find((e) => e.key === entry2.key);
    expect(next.gap_minuti).toBe(60);
    expect(next.gap_originale).toBe(60);
    expect(next.dose_prec_saltata).toBe(true);
  });

  it('dovrebbe produrre 2 logWrites (target + N+1) e nessun prompt anche se gap > SOGLIA', () => {
    const result = applySalto(plan, entry1.key);
    expect(result.logWrites).toHaveLength(2);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// T08 — applySalto farmaco fisso
// ============================================================

describe('T08 — applySalto farmaco fisso', () => {
  let farmaco, orario, entry, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 2,
      nome: 'Fixed 50mg',
      tipo_frequenza: 'fisso',
      dosi_giornaliere: 1,
    });
    orario = makeOrario(2, 1);
    entry = makeEntry(farmaco, orario, '2026-04-16', '07:30');
    plan = [entry];
  });

  it('dovrebbe marcare la dose come saltata', () => {
    const result = applySalto(plan, entry.key);
    const updated = result.plan.find((e) => e.key === entry.key);
    expect(updated.stato).toBe('saltata');
  });

  it('dovrebbe produrre 1 logWrite (solo target, nessuna N+1) e nessun prompt', () => {
    const result = applySalto(plan, entry.key);
    expect(result.logWrites).toHaveLength(1);
    expect(result.logWrites[0].stato).toBe('saltata');
    expect(result.prompt).toBeNull();
  });

  it('dovrebbe settare dose_prec_saltata=true su N+1 anche per farmaco fisso (multi-dose)', () => {
    // Edge case: a fixed-schedule farmaco with multiple daily doses (rare).
    // Verifies that the warning flag is propagated even without gap propagation.
    const fissoMulti = makeFarmaco({
      id: 3,
      tipo_frequenza: 'fisso',
      dosi_giornaliere: 2,
    });
    const o1 = makeOrario(3, 1);
    const o2 = makeOrario(3, 2);
    const e1 = makeEntry(fissoMulti, o1, '2026-04-16', '07:30');
    const e2 = makeEntry(fissoMulti, o2, '2026-04-16', '20:30');
    const p = [e1, e2];
    const result = applySalto(p, e1.key);
    const next = result.plan.find((x) => x.key === e2.key);
    expect(next.dose_prec_saltata).toBe(true);
    expect(next.gap_minuti).toBe(0); // no gap propagation for fixed
    expect(result.logWrites).toHaveLength(2);
  });
});

// ============================================================
// T03 — applyAssunzione su farmaco fisso (caso base)
// ============================================================

describe('T03 — applyAssunzione su farmaco fisso (caso base)', () => {
  let farmaco, orario, entry, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      nome: 'Fixed 50mg',
      tipo_frequenza: 'fisso',
      dosi_giornaliere: 1,
    });
    orario = makeOrario(1, 1);
    entry = makeEntry(farmaco, orario, '2026-04-16', '07:30');
    plan = [entry];
  });

  it('dovrebbe marcare la dose come presa con ora_effettiva e delta corretti', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '07:35',
    });
    const updated = result.plan.find((e) => e.key === entry.key);
    expect(updated.stato).toBe('presa');
    expect(updated.ora_effettiva).toBe('2026-04-16T07:35:00');
    expect(updated.delta_minuti).toBe(5);
  });

  it('dovrebbe produrre 1 logWrite e nessun prompt per farmaco fisso', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '07:35',
    });
    expect(result.logWrites).toHaveLength(1);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// T04 — applyAssunzione intervallo, ricalcolo dose N+1, prompt
// ============================================================

describe('T04 — applyAssunzione farmaco a intervallo (ricalcolo N+1)', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00');
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    plan = [entry1, entry2];
  });

  it('dovrebbe marcare dose 1 come presa con delta +120', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry1.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '10:00',
    });
    const d1 = result.plan.find((e) => e.key === entry1.key);
    expect(d1.stato).toBe('presa');
    expect(d1.delta_minuti).toBe(120);
  });

  it('dovrebbe ricalcolare dose 2 a 18:00 con gap_minuti=120, recupero=0', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry1.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '10:00',
    });
    const d2 = result.plan.find((e) => e.key === entry2.key);
    expect(d2.stato).toBe('ricalcolata');
    expect(d2.ora_ricalcolata).toBe('18:00');
    expect(d2.ora_ricalcolata_originale).toBe('18:00');
    expect(d2.gap_minuti).toBe(120);
    expect(d2.gap_originale).toBe(120);
    expect(d2.recupero_minuti).toBe(0);
  });

  it('dovrebbe emettere prompt gap_recovery con entryKey di dose 2', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry1.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '10:00',
    });
    expect(result.prompt).not.toBeNull();
    expect(result.prompt.kind).toBe('gap_recovery');
    expect(result.prompt.entryKey).toBe(entry2.key);
  });

  it('dovrebbe produrre 2 logWrites (target + N+1 ricalcolata)', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry1.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '10:00',
    });
    expect(result.logWrites).toHaveLength(2);
  });
});

// ============================================================
// T05 — applyAssunzione con auto-skip di dose precedente
// ============================================================

describe('T05 — applyAssunzione con auto-skip', () => {
  let farmaco, orario1, orario2, orario3, entry1, entry2, entry3, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 3,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    orario3 = makeOrario(1, 3);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00');
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    entry3 = makeEntry(farmaco, orario3, '2026-04-16', '00:00');
    plan = [entry1, entry2, entry3];
  });

  it('dovrebbe marcare dose 1 come saltata (auto-skip)', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry2.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '16:00',
    });
    const d1 = result.plan.find((e) => e.key === entry1.key);
    expect(d1.stato).toBe('saltata');
  });

  it('dovrebbe marcare dose 2 come presa con delta 0', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry2.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '16:00',
    });
    const d2 = result.plan.find((e) => e.key === entry2.key);
    expect(d2.stato).toBe('presa');
    expect(d2.delta_minuti).toBe(0);
  });

  it('dovrebbe ricalcolare dose 3 a 00:00 con gap=0 e dose_prec_saltata=true', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry2.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '16:00',
    });
    const d3 = result.plan.find((e) => e.key === entry3.key);
    expect(d3.stato).toBe('ricalcolata');
    expect(d3.ora_ricalcolata).toBe('00:00');
    expect(d3.gap_minuti).toBe(0);
    expect(d3.dose_prec_saltata).toBe(true);
  });

  it('dovrebbe produrre 3 logWrites (skipped + target + N+1) e prompt=null (gap=0)', () => {
    const result = applyAssunzione(plan, {
      entryKey: entry2.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '16:00',
    });
    expect(result.logWrites).toHaveLength(3);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// T06 — applyAssunzione cross-day (dose 1 del giorno dopo)
// ============================================================

describe('T06 — applyAssunzione cross-day', () => {
  let farmaco, o16_d3, o17_d1, e16_d3, e17_d1, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 3,
    });
    o16_d3 = makeOrario(1, 3);
    o17_d1 = makeOrario(1, 1);
    // Dose 3 del 2026-04-16 prevista alle 23:00
    e16_d3 = makeEntry(farmaco, o16_d3, '2026-04-16', '23:00');
    // Dose 1 del 2026-04-17 prevista alle 07:00
    e17_d1 = makeEntry(farmaco, o17_d1, '2026-04-17', '07:00');
    plan = [e16_d3, e17_d1];
  });

  it('dovrebbe ricalcolare dose 1 del 17 a 07:30 quando dose 3 del 16 è presa alle 23:30', () => {
    const result = applyAssunzione(plan, {
      entryKey: e16_d3.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '23:30',
    });
    const next = result.plan.find((e) => e.key === e17_d1.key);
    expect(next.stato).toBe('ricalcolata');
    expect(next.ora_ricalcolata).toBe('07:30');
    expect(next.dateStr).toBe('2026-04-17');
  });

  it('dovrebbe settare gap=30 su dose 1 del 17 (delta=+30) e prompt=null (30 non > 30)', () => {
    const result = applyAssunzione(plan, {
      entryKey: e16_d3.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '23:30',
    });
    const next = result.plan.find((e) => e.key === e17_d1.key);
    expect(next.gap_minuti).toBe(30);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// T10 — applyRecupero (valido + validazioni)
// ============================================================

describe('T10 — applyRecupero', () => {
  let farmaco, orario1, orario2, entryRicalc, entryPrevista, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    // Dose 2 già ricalcolata a 18:00 con gap=120 (scenario post-T04)
    entryRicalc = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '18:00',
      ora_ricalcolata_originale: '18:00',
      gap_minuti: 120,
      gap_originale: 120,
      recupero_minuti: 0,
    });
    // Dose 1 in stato prevista (per test di validazione)
    entryPrevista = makeEntry(farmaco, orario1, '2026-04-17', '08:00');
    plan = [entryRicalc, entryPrevista];
  });

  describe('caso valido', () => {
    it('dovrebbe anticipare ora_ricalcolata a 17:00 con recupero=60 e lasciare gap invariato', () => {
      const result = applyRecupero(plan, entryRicalc.key, 60);
      const updated = result.plan.find((e) => e.key === entryRicalc.key);
      expect(updated.ora_ricalcolata).toBe('17:00');
      expect(updated.recupero_minuti).toBe(60);
      expect(updated.gap_minuti).toBe(120);
      expect(updated.gap_originale).toBe(120);
    });

    it('dovrebbe produrre 1 logWrite e nessun prompt', () => {
      const result = applyRecupero(plan, entryRicalc.key, 60);
      expect(result.logWrites).toHaveLength(1);
      expect(result.prompt).toBeNull();
    });
  });

  describe('validazioni', () => {
    it('dovrebbe sollevare RECUPERO_ECCESSIVO per recupero > max', () => {
      // gap=120, intervallo_minimo=4h → max=min(120, (8-4)*60)=120. 300 > 120.
      expect(() => applyRecupero(plan, entryRicalc.key, 300)).toThrow(DomainError);
      try {
        applyRecupero(plan, entryRicalc.key, 300);
      } catch (e) {
        expect(e.code).toBe('RECUPERO_ECCESSIVO');
      }
    });

    it('dovrebbe sollevare RECUPERO_NEGATIVO per recupero < 0', () => {
      try {
        applyRecupero(plan, entryRicalc.key, -10);
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe('RECUPERO_NEGATIVO');
      }
    });

    it('dovrebbe sollevare RECUPERO_SU_DOSE_NON_RICALCOLATA per dose in stato prevista', () => {
      try {
        applyRecupero(plan, entryPrevista.key, 30);
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(DomainError);
        expect(e.code).toBe('RECUPERO_SU_DOSE_NON_RICALCOLATA');
      }
    });
  });
});

// ============================================================
// BONUS — Immutabilità del plan in ingresso
// ============================================================

describe('Immutabilità — il plan originale non viene mutato', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00');
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    plan = [entry1, entry2];
  });

  it('applyAssunzione non dovrebbe mutare il plan originale', () => {
    const snapshot = structuredClone(plan);
    applyAssunzione(plan, {
      entryKey: entry1.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '10:00',
    });
    expect(plan).toEqual(snapshot);
  });

  it('applySospensione non dovrebbe mutare il plan originale', () => {
    const snapshot = structuredClone(plan);
    applySospensione(plan, entry1.key);
    expect(plan).toEqual(snapshot);
  });

  it('applySalto non dovrebbe mutare il plan originale', () => {
    const snapshot = structuredClone(plan);
    applySalto(plan, entry1.key);
    expect(plan).toEqual(snapshot);
  });

  it('applyRecupero non dovrebbe mutare il plan originale', () => {
    // Serve un plan con una dose ricalcolata per testare applyRecupero.
    const ricalcEntry = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '18:00',
      ora_ricalcolata_originale: '18:00',
      gap_minuti: 120,
      gap_originale: 120,
    });
    const testPlan = [entry1, ricalcEntry];
    const snapshot = structuredClone(testPlan);
    applyRecupero(testPlan, ricalcEntry.key, 60);
    expect(testPlan).toEqual(snapshot);
  });
});

// ============================================================
// T11 — annullaAssunzione ripristina dose e N+1 (post-T04 + recupero)
// ============================================================

describe('T11 — annullaAssunzione ripristina dose e N+1', () => {
  let farmaco, orario1, orario2, plan, entry1Key, entry2Key;

  beforeEach(() => {
    // Reconstruct the post-T04 + recupero scenario by wiring up the final
    // state directly (avoids chaining through applyAssunzione + applyRecupero).
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    const e1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T10:00:00',
      delta_minuti: 120,
    });
    const e2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '17:00',        // post-recupero 60
      ora_ricalcolata_originale: '18:00',
      gap_minuti: 120,
      gap_originale: 120,
      recupero_minuti: 60,
    });
    plan = [e1, e2];
    entry1Key = e1.key;
    entry2Key = e2.key;
  });

  it('dovrebbe ripristinare dose 1 a prevista con ora_effettiva e delta azzerati', () => {
    const result = annullaAssunzione(plan, entry1Key);
    const d1 = result.plan.find((e) => e.key === entry1Key);
    expect(d1.stato).toBe('prevista');
    expect(d1.ora_effettiva).toBeNull();
    expect(d1.delta_minuti).toBeNull();
  });

  it('dovrebbe azzerare tutti i campi di ricalcolo su dose 2 e riportarla a prevista', () => {
    const result = annullaAssunzione(plan, entry1Key);
    const d2 = result.plan.find((e) => e.key === entry2Key);
    expect(d2.stato).toBe('prevista');
    expect(d2.ora_ricalcolata).toBeNull();
    expect(d2.ora_ricalcolata_originale).toBeNull();
    expect(d2.gap_minuti).toBe(0);
    expect(d2.gap_originale).toBe(0);
    expect(d2.recupero_minuti).toBe(0);
    expect(d2.dose_prec_saltata).toBe(false);
  });

  it('dovrebbe produrre 2 logWrites (target + N+1) e nessun prompt', () => {
    const result = annullaAssunzione(plan, entry1Key);
    expect(result.logWrites).toHaveLength(2);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// CP3 bonus — annullaAssunzione NON tocca N+1 se non 'ricalcolata'
// ============================================================

describe('annullaAssunzione su farmaco fisso (nessuna N+1 da ripristinare)', () => {
  it('dovrebbe ripristinare solo la dose target (1 logWrite)', () => {
    const farmaco = makeFarmaco({
      id: 2,
      tipo_frequenza: 'fisso',
      dosi_giornaliere: 1,
    });
    const orario = makeOrario(2, 1);
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T07:35:00',
      delta_minuti: 5,
    });
    const plan = [entry];
    const result = annullaAssunzione(plan, entry.key);
    const updated = result.plan.find((e) => e.key === entry.key);
    expect(updated.stato).toBe('prevista');
    expect(updated.ora_effettiva).toBeNull();
    expect(updated.delta_minuti).toBeNull();
    expect(result.logWrites).toHaveLength(1);
    expect(result.prompt).toBeNull();
  });
});

// ============================================================
// ricalcolaPianoDaProfilo — fixtures + tests (AMB-3)
// ============================================================

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

describe('ricalcolaPianoDaProfilo — ricalcolo ora_prevista base', () => {
  it('dovrebbe ricalcolare ora_prevista da Standard a Nottambulo per entry prevista', () => {
    const farmaco = makeFarmaco({ id: 1 });
    const orario = makeOrario(1, 1, 0, 'colazione'); // offset 0, anchor colazione
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30');
    const plan = [entry];
    const newPlan = ricalcolaPianoDaProfilo(plan, profiloNottambulo);
    expect(newPlan[0].ora_prevista).toBe('10:30');
    expect(newPlan[0].stato).toBe('prevista');
  });
});

describe('ricalcolaPianoDaProfilo — invariante delta storico (AMB-3 #1)', () => {
  it('dovrebbe aggiornare ora_prevista ma lasciare ora_effettiva e delta invariati su entry presa', () => {
    const farmaco = makeFarmaco({ id: 1 });
    const orario = makeOrario(1, 1, 0, 'colazione'); // colazione offset 0 → 07:30 std, 10:30 nottambulo
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T07:35:00',
      delta_minuti: 5,
    });
    const plan = [entry];
    const newPlan = ricalcolaPianoDaProfilo(plan, profiloNottambulo);
    const updated = newPlan[0];
    expect(updated.ora_prevista).toBe('10:30');
    expect(updated.ora_effettiva).toBe('2026-04-16T07:35:00');
    expect(updated.delta_minuti).toBe(5);
    expect(updated.stato).toBe('presa');
  });
});

describe('ricalcolaPianoDaProfilo — invariante reset su ricalcolata (AMB-3 #2)', () => {
  it('dovrebbe resettare una entry ricalcolata a prevista azzerando tutti i campi di ricalcolo', () => {
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    const orario = makeOrario(1, 2, 0, 'cena'); // cena → 20:30 std, 21:30 nottambulo
    const entry = makeEntry(farmaco, orario, '2026-04-16', '20:30', {
      stato: 'ricalcolata',
      ora_ricalcolata: '18:00',
      ora_ricalcolata_originale: '18:00',
      gap_minuti: 120,
      gap_originale: 120,
      recupero_minuti: 60,
      dose_prec_saltata: true,
    });
    const plan = [entry];
    const newPlan = ricalcolaPianoDaProfilo(plan, profiloNottambulo);
    const updated = newPlan[0];
    expect(updated.stato).toBe('prevista');
    expect(updated.ora_prevista).toBe('21:30');
    expect(updated.ora_ricalcolata).toBeNull();
    expect(updated.ora_ricalcolata_originale).toBeNull();
    expect(updated.gap_minuti).toBe(0);
    expect(updated.gap_originale).toBe(0);
    expect(updated.recupero_minuti).toBe(0);
    expect(updated.dose_prec_saltata).toBe(false);
  });
});

describe('ricalcolaPianoDaProfilo — non muta il plan originale', () => {
  it('dovrebbe lasciare invariato il plan in ingresso', () => {
    const farmaco = makeFarmaco({ id: 1 });
    const orario = makeOrario(1, 1, 0, 'colazione');
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T07:35:00',
      delta_minuti: 5,
    });
    const plan = [entry];
    const snapshot = structuredClone(plan);
    ricalcolaPianoDaProfilo(plan, profiloNottambulo);
    expect(plan).toEqual(snapshot);
  });
});

// ============================================================
// CP4 — Copertura branch residui
// ============================================================

describe('CP4 — branch coverage', () => {
  it('autoSkip dovrebbe marcare come saltata anche dosi precedenti in stato ricalcolata', () => {
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 3,
    });
    const o1 = makeOrario(1, 1);
    const o2 = makeOrario(1, 2);
    const o3 = makeOrario(1, 3);
    // Dose 1 'ricalcolata' (scenario: una catena era già in corso).
    const e1 = makeEntry(farmaco, o1, '2026-04-16', '08:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '09:00',
      ora_ricalcolata_originale: '09:00',
      gap_minuti: 60,
      gap_originale: 60,
    });
    const e2 = makeEntry(farmaco, o2, '2026-04-16', '16:00');
    const e3 = makeEntry(farmaco, o3, '2026-04-16', '00:00');
    const plan = [e1, e2, e3];
    // User takes dose 3 directly: dose 1 AND dose 2 should be auto-skipped.
    const result = applyAssunzione(plan, {
      entryKey: e3.key,
      dataEffettiva: '2026-04-16',
      oraEffettiva: '00:00',
    });
    const d1 = result.plan.find((e) => e.key === e1.key);
    const d2 = result.plan.find((e) => e.key === e2.key);
    expect(d1.stato).toBe('saltata'); // era 'ricalcolata', copre il secondo ramo dell'OR
    expect(d2.stato).toBe('saltata');
  });

  it('applyRecupero dovrebbe usare ora_ricalcolata se ora_ricalcolata_originale è null', () => {
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    const orario = makeOrario(1, 2);
    // ora_ricalcolata_originale null, solo ora_ricalcolata valorizzato.
    const entry = makeEntry(farmaco, orario, '2026-04-16', '16:00', {
      stato: 'ricalcolata',
      ora_ricalcolata: '18:00',
      ora_ricalcolata_originale: null,
      gap_minuti: 60,
      gap_originale: 60,
    });
    const plan = [entry];
    const result = applyRecupero(plan, entry.key, 30);
    const updated = result.plan.find((e) => e.key === entry.key);
    // 18:00 - 30min = 17:30 (fallback su ora_ricalcolata)
    expect(updated.ora_ricalcolata).toBe('17:30');
    expect(updated.recupero_minuti).toBe(30);
  });

  it('annullaAssunzione dovrebbe ripristinare target a ricalcolata se aveva ora_ricalcolata', () => {
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    const orario = makeOrario(1, 2);
    // Target era ricalcolata e poi presa: ora_ricalcolata persiste sul campo.
    const entry = makeEntry(farmaco, orario, '2026-04-16', '16:00', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T18:00:00',
      delta_minuti: 0,
      ora_ricalcolata: '18:00',
      ora_ricalcolata_originale: '18:00',
      gap_minuti: 0,
      gap_originale: 0,
    });
    const plan = [entry];
    const result = annullaAssunzione(plan, entry.key);
    const updated = result.plan.find((e) => e.key === entry.key);
    // Ramo 'ricalcolata': ora_ricalcolata non-null sul target al momento dell'undo.
    expect(updated.stato).toBe('ricalcolata');
    expect(updated.ora_effettiva).toBeNull();
    expect(updated.delta_minuti).toBeNull();
  });
});

// ============================================================
// T13 — applyRipristino (Sessione 5a)
// ============================================================

describe('T13 — applyRipristino: sospesa → attiva', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', {
      stato: 'sospesa',
    });
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00');
    plan = [entry1, entry2];
  });

  it('dovrebbe ripristinare target a prevista se ora_ricalcolata è null', () => {
    const result = applyRipristino(plan, entry1.key, 'attiva');
    const updated = result.plan.find((e) => e.key === entry1.key);
    expect(updated.stato).toBe('prevista');
  });

  it('dovrebbe ripristinare target a ricalcolata se ora_ricalcolata è valorizzata', () => {
    const planRic = [
      { ...entry1, stato: 'sospesa', ora_ricalcolata: '09:00', ora_ricalcolata_originale: '09:00', gap_minuti: 60 },
      entry2,
    ];
    const result = applyRipristino(planRic, entry1.key, 'attiva');
    const updated = result.plan.find((e) => e.key === entry1.key);
    expect(updated.stato).toBe('ricalcolata');
    expect(updated.ora_ricalcolata).toBe('09:00');
    expect(updated.gap_minuti).toBe(60);
  });

  it('non dovrebbe toccare la dose N+1', () => {
    const result = applyRipristino(plan, entry1.key, 'attiva');
    const next = result.plan.find((e) => e.key === entry2.key);
    expect(next.stato).toBe('prevista');
    expect(next.gap_minuti).toBe(0);
    expect(next.dose_prec_saltata).toBe(false);
  });

  it('dovrebbe produrre 1 logWrite e nessun prompt', () => {
    const result = applyRipristino(plan, entry1.key, 'attiva');
    expect(result.logWrites).toHaveLength(1);
    expect(result.logWrites[0].stato).toBe('prevista');
    expect(result.prompt).toBeNull();
  });
});

describe('T13 — applyRipristino: saltata → sospesa (intervallo con rollback)', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    // Scenario: target (dose 1) saltata con pass-through gap=60 verso N+1 (dose 2).
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', {
      stato: 'saltata',
      gap_minuti: 60,
      gap_originale: 60,
    });
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'prevista',
      gap_minuti: 60,           // ricevuto dal pass-through di applySalto
      gap_originale: 60,
      dose_prec_saltata: true,  // marker del pass-through
    });
    plan = [entry1, entry2];
  });

  it('dovrebbe cambiare stato target a sospesa', () => {
    const result = applyRipristino(plan, entry1.key, 'sospesa');
    const updated = result.plan.find((e) => e.key === entry1.key);
    expect(updated.stato).toBe('sospesa');
  });

  it('dovrebbe rollback N+1: gap=0, gap_originale=0, dose_prec_saltata=false', () => {
    const result = applyRipristino(plan, entry1.key, 'sospesa');
    const next = result.plan.find((e) => e.key === entry2.key);
    expect(next.gap_minuti).toBe(0);
    expect(next.gap_originale).toBe(0);
    expect(next.dose_prec_saltata).toBe(false);
    expect(next.stato).toBe('prevista');
  });

  it('dovrebbe produrre 2 logWrites (target + N+1)', () => {
    const result = applyRipristino(plan, entry1.key, 'sospesa');
    expect(result.logWrites).toHaveLength(2);
    expect(result.prompt).toBeNull();
  });
});

describe('T13 — applyRipristino: saltata → attiva (con rollback)', () => {
  let farmaco, orario1, orario2, entry1, entry2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
    entry1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', {
      stato: 'saltata',
    });
    entry2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'prevista',
      gap_minuti: 0,
      dose_prec_saltata: true,
    });
    plan = [entry1, entry2];
  });

  it('dovrebbe ripristinare target a prevista e fare rollback N+1', () => {
    const result = applyRipristino(plan, entry1.key, 'attiva');
    const target = result.plan.find((e) => e.key === entry1.key);
    const next = result.plan.find((e) => e.key === entry2.key);
    expect(target.stato).toBe('prevista');
    expect(next.dose_prec_saltata).toBe(false);
    expect(result.logWrites).toHaveLength(2);
  });
});

describe('T13 — applyRipristino: rollback conservativo (N+1 non eleggibile)', () => {
  let farmaco, orario1, orario2, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    orario1 = makeOrario(1, 1);
    orario2 = makeOrario(1, 2);
  });

  it('non dovrebbe toccare N+1 se N+1.stato !== prevista (es. presa)', () => {
    const e1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', { stato: 'saltata' });
    const e2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'presa',
      ora_effettiva: '2026-04-16T16:00:00',
      delta_minuti: 0,
      dose_prec_saltata: true,
    });
    const p = [e1, e2];
    const result = applyRipristino(p, e1.key, 'sospesa');
    const next = result.plan.find((e) => e.key === e2.key);
    expect(next.stato).toBe('presa');
    expect(next.dose_prec_saltata).toBe(true); // non toccato
    expect(result.logWrites).toHaveLength(1);
  });

  it('non dovrebbe toccare N+1 se dose_prec_saltata === false', () => {
    const e1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', { stato: 'saltata' });
    const e2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'prevista',
      dose_prec_saltata: false,  // marker assente
    });
    const p = [e1, e2];
    const result = applyRipristino(p, e1.key, 'sospesa');
    expect(result.logWrites).toHaveLength(1);
  });

  it('non dovrebbe toccare N+1 quando target era sospesa (no propagazione da rollback)', () => {
    const e1 = makeEntry(farmaco, orario1, '2026-04-16', '08:00', { stato: 'sospesa' });
    const e2 = makeEntry(farmaco, orario2, '2026-04-16', '16:00', {
      stato: 'prevista',
      dose_prec_saltata: true, // marker spurio: sospesa non doveva averlo messo, ma rollback non deve rimuoverlo
    });
    const p = [e1, e2];
    const result = applyRipristino(p, e1.key, 'attiva');
    const next = result.plan.find((e) => e.key === e2.key);
    expect(next.dose_prec_saltata).toBe(true); // non toccato: ripristino da sospesa non fa rollback
    expect(result.logWrites).toHaveLength(1);
  });
});

describe('T13 — applyRipristino: validazioni', () => {
  let farmaco, orario, plan;

  beforeEach(() => {
    farmaco = makeFarmaco({ id: 1 });
    orario = makeOrario(1, 1);
  });

  it('RIPRISTINO_STATO_INVALIDO: target in stato prevista', () => {
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', { stato: 'prevista' });
    plan = [entry];
    try {
      applyRipristino(plan, entry.key, 'attiva');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe('RIPRISTINO_STATO_INVALIDO');
    }
  });

  it('RIPRISTINO_STATO_INVALIDO: target in stato presa', () => {
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', { stato: 'presa' });
    plan = [entry];
    expect(() => applyRipristino(plan, entry.key, 'attiva')).toThrow(DomainError);
  });

  it('RIPRISTINO_TARGET_INVALIDO: to non valido', () => {
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', { stato: 'saltata' });
    plan = [entry];
    try {
      applyRipristino(plan, entry.key, 'invalid');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe('RIPRISTINO_TARGET_INVALIDO');
    }
  });

  it('RIPRISTINO_NOOP: sospesa → sospesa', () => {
    const entry = makeEntry(farmaco, orario, '2026-04-16', '07:30', { stato: 'sospesa' });
    plan = [entry];
    try {
      applyRipristino(plan, entry.key, 'sospesa');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect(e.code).toBe('RIPRISTINO_NOOP');
    }
  });
});

describe('T13 — applyRipristino: immutabilità', () => {
  it('non dovrebbe mutare il plan originale', () => {
    const farmaco = makeFarmaco({
      id: 1,
      tipo_frequenza: 'intervallo',
      intervallo_ore: 8,
      intervallo_minimo_ore: 4,
      dosi_giornaliere: 2,
    });
    const o1 = makeOrario(1, 1);
    const o2 = makeOrario(1, 2);
    const e1 = makeEntry(farmaco, o1, '2026-04-16', '08:00', { stato: 'saltata', gap_minuti: 60 });
    const e2 = makeEntry(farmaco, o2, '2026-04-16', '16:00', {
      gap_minuti: 60, gap_originale: 60, dose_prec_saltata: true,
    });
    const plan = [e1, e2];
    const snapshot = structuredClone(plan);
    applyRipristino(plan, e1.key, 'sospesa');
    expect(plan).toEqual(snapshot);
  });
});
