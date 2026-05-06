// ============================================================
// selectProssimaDoseFuoriPlan unit tests — par.6.188 (CP10 v3.0.0 Step 2,
// sub-AMB 13.d par.22.43 generalizzato da par.22.42 EXT.3'.a).
// ============================================================

import { describe, it, expect } from 'vitest';
import { selectProssimaDoseFuoriPlan } from './selectors.js';

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

function makeFarmaco(over = {}) {
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
    data_inizio: '2026-04-01',
    data_fine: null,
    attivo: 1,
    ...over,
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

describe('selectProssimaDoseFuoriPlan (CP10 sub-AMB 13.d)', () => {
  // --------------------------------------------------------
  // T1 — extended-only off-day: settimanale 168h, anchor 1 mese fa,
  // today cade tra k=4 e k=5 -> ritorna k=5.
  // --------------------------------------------------------
  it('(T1) extended-only 168h off-day: ritorna prossima occorrenza fuori plan', () => {
    // Anchor 2026-04-01 (Wed) 07:30. k=4 -> 2026-04-29 (Wed) 07:30.
    // k=5 -> 2026-05-06 (Wed) 07:30. Today = 2026-05-04 (Mon).
    // Plan window [today-1, today+1] = [05-03, 05-05] non contiene k=5.
    const farmaco = makeFarmaco({
      id: 99,
      nome: 'Metotrexato',
      tipo_frequenza: 'intervallo',
      intervallo_ore: 168,
      data_inizio: '2026-04-01',
    });
    const orario = makeOrario(99, 1, 0, 'colazione');

    const state = {
      farmaci: [farmaco],
      orari: [orario],
      profiloAttivo: profiloStandard,
    };

    const result = selectProssimaDoseFuoriPlan(state, '2026-05-04');

    expect(result).not.toBeNull();
    expect(result.dateStr).toBe('2026-05-06');
    expect(result.oraPrevista).toBe('07:30');
    expect(result.farmaco.id).toBe(99);
    expect(result.orario.dose_numero).toBe(1);
  });

  // --------------------------------------------------------
  // T2 — caso misto (sub-AMB 13.d): farmaco standard data_inizio futura
  // + farmaco extended off-day. Selector ritorna il MINIMO cronologico.
  // --------------------------------------------------------
  it('(T2) caso misto: standard data_inizio futura + extended off-day -> ritorna il minimo cronologico', () => {
    // Standard: dosi 2x/die orari 07:30 + 20:30 (cena), data_inizio futura.
    const standard = makeFarmaco({
      id: 50,
      nome: 'Olevia',
      tipo_frequenza: 'intervallo',
      intervallo_ore: 12,
      dosi_giornaliere: 2,
      data_inizio: '2026-05-08', // 4 giorni futuro
    });
    const standardOrario1 = makeOrario(50, 1, 0, 'colazione');   // 07:30
    const standardOrario2 = makeOrario(50, 2, 0, 'cena');         // 20:30

    // Extended weekly, anchor 2026-04-01, k=5 cade 2026-05-06.
    const extended = makeFarmaco({
      id: 99,
      nome: 'Metotrexato',
      tipo_frequenza: 'intervallo',
      intervallo_ore: 168,
      data_inizio: '2026-04-01',
    });
    const extendedOrario = makeOrario(99, 1, 0, 'colazione');

    const state = {
      farmaci: [standard, extended],
      orari: [standardOrario1, standardOrario2, extendedOrario],
      profiloAttivo: profiloStandard,
    };

    const result = selectProssimaDoseFuoriPlan(state, '2026-05-04');

    // Extended k=5 (2026-05-06) batte standard data_inizio (2026-05-08).
    expect(result).not.toBeNull();
    expect(result.dateStr).toBe('2026-05-06');
    expect(result.farmaco.id).toBe(99);
    expect(result.farmaco.nome).toBe('Metotrexato');
  });
});
