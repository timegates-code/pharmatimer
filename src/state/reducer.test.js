// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './reducer.js';

// ============================================================
// Helpers
// ============================================================

function makeProfilo(overrides = {}) {
  return {
    id: 1, nome_profilo: 'Standard',
    ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:00', ora_sonno: '23:00',
    attivo: 1, ...overrides,
  };
}

function makeFarmaco(overrides = {}) {
  return {
    id: 1, nome: 'Test',
    tipo_frequenza: 'fisso', intervallo_ore: null,
    intervallo_minimo_ore: null, dosi_giornaliere: 1,
    relazione_pasto: 'indifferente',
    data_inizio: '2026-01-01', data_fine: null, attivo: 1,
    ...overrides,
  };
}

function makeEntry(key = '2026-04-18-1-1', overrides = {}) {
  return {
    key, dateStr: '2026-04-18',
    farmaco: makeFarmaco(), orario: { id: 1, farmaco_id: 1, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'sveglia' },
    ora_prevista: '07:00', ora_ricalcolata: null, ora_ricalcolata_originale: null,
    ora_effettiva: null, delta_minuti: null,
    gap_minuti: 0, gap_originale: 0, recupero_minuti: 0,
    stato: 'prevista', dose_prec_saltata: false,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe('reducer — stato iniziale', () => {
  it('ha tutti i campi attesi con i default corretti', () => {
    expect(initialState).toEqual({
      status: 'idle',
      impostazioni: {},
      profili: [],
      profiloAttivo: null,
      farmaci: [],
      orari: [],
      plan: [],
      prompt: null,
      presoStack: [],
      error: null,
      simulatedNow: null,
      lastBuiltForDay: null,
    });
  });
});

describe('reducer — init flow', () => {
  it('INIT_START resetta error e lascia status idle', () => {
    const s = { ...initialState, error: { kind: 'init', message: 'old' } };
    const next = reducer(s, { type: 'INIT_START' });
    expect(next.status).toBe('idle');
    expect(next.error).toBeNull();
  });

  it('INIT_SUCCESS popola tutti i dati e porta status a ready', () => {
    const payload = {
      impostazioni: { nome_utente: 'Mario' },
      profili: [makeProfilo()],
      profiloAttivo: makeProfilo(),
      farmaci: [makeFarmaco()],
      orari: [{ id: 1, farmaco_id: 1, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'sveglia' }],
      plan: [makeEntry()],
      lastBuiltForDay: '2026-04-18',
    };
    const next = reducer(initialState, { type: 'INIT_SUCCESS', payload });
    expect(next.status).toBe('ready');
    expect(next.error).toBeNull();
    expect(next.impostazioni).toEqual({ nome_utente: 'Mario' });
    expect(next.profiloAttivo.nome_profilo).toBe('Standard');
    expect(next.farmaci).toHaveLength(1);
    expect(next.plan).toHaveLength(1);
    expect(next.lastBuiltForDay).toBe('2026-04-18');
  });

  it('INIT_ERROR porta status a error e imposta kind=init', () => {
    const next = reducer(initialState, {
      type: 'INIT_ERROR',
      payload: { message: 'DB non disponibile' },
    });
    expect(next.status).toBe('error');
    expect(next.error).toEqual({ kind: 'init', message: 'DB non disponibile' });
  });
});

describe('reducer — COMMIT_APPLY_RESULT', () => {
  const base = { ...initialState, status: 'ready', plan: [makeEntry()] };

  it('aggiorna plan e prompt, non modifica presoStack se pushPresoKey è null', () => {
    const newPlan = [makeEntry('2026-04-18-1-1', { stato: 'presa' })];
    const next = reducer(base, {
      type: 'COMMIT_APPLY_RESULT',
      payload: { plan: newPlan, prompt: null, pushPresoKey: null },
    });
    expect(next.plan).toBe(newPlan);
    expect(next.prompt).toBeNull();
    expect(next.presoStack).toEqual([]);
  });

  it('imposta prompt quando fornito dal dominio', () => {
    const prompt = { kind: 'gap_recovery', entryKey: '2026-04-18-1-2' };
    const next = reducer(base, {
      type: 'COMMIT_APPLY_RESULT',
      payload: { plan: base.plan, prompt, pushPresoKey: null },
    });
    expect(next.prompt).toEqual(prompt);
  });

  it('appende pushPresoKey alla presoStack preservando ordine', () => {
    const s = { ...base, presoStack: ['k1'] };
    const next = reducer(s, {
      type: 'COMMIT_APPLY_RESULT',
      payload: { plan: base.plan, prompt: null, pushPresoKey: 'k2' },
    });
    expect(next.presoStack).toEqual(['k1', 'k2']);
  });
});

describe('reducer — plan maintenance', () => {
  it('SET_PLAN sostituisce il plan (usato per rollback)', () => {
    const s = { ...initialState, plan: [makeEntry()] };
    const snapshot = [makeEntry('old-key')];
    const next = reducer(s, { type: 'SET_PLAN', payload: snapshot });
    expect(next.plan).toBe(snapshot);
  });

  it('REBUILD_PLAN aggiorna plan + lastBuiltForDay insieme', () => {
    const newPlan = [makeEntry()];
    const next = reducer(initialState, {
      type: 'REBUILD_PLAN',
      payload: { plan: newPlan, lastBuiltForDay: '2026-04-19' },
    });
    expect(next.plan).toBe(newPlan);
    expect(next.lastBuiltForDay).toBe('2026-04-19');
  });

  it('DISMISS_PROMPT azzera solo prompt', () => {
    const s = { ...initialState, prompt: { kind: 'gap_recovery', entryKey: 'x' } };
    const next = reducer(s, { type: 'DISMISS_PROMPT' });
    expect(next.prompt).toBeNull();
  });

  it('POP_PRESO_STACK rimuove l\'ultimo entry', () => {
    const s = { ...initialState, presoStack: ['a', 'b', 'c'] };
    const next = reducer(s, { type: 'POP_PRESO_STACK' });
    expect(next.presoStack).toEqual(['a', 'b']);
  });

  it('POP_PRESO_STACK su stack vuoto ritorna lo stato invariato', () => {
    const next = reducer(initialState, { type: 'POP_PRESO_STACK' });
    expect(next).toBe(initialState);
  });
});

describe('reducer — APPLY_CAMBIO_PROFILO', () => {
  it('aggiorna profiloAttivo/profili/plan/lastBuiltForDay e resetta prompt + presoStack', () => {
    const s = {
      ...initialState,
      status: 'ready',
      profiloAttivo: makeProfilo({ id: 1 }),
      profili: [makeProfilo({ id: 1, attivo: 1 }), makeProfilo({ id: 2, attivo: 0, nome_profilo: 'Nottambulo' })],
      prompt: { kind: 'gap_recovery', entryKey: 'k' },
      presoStack: ['k1', 'k2'],
      plan: [makeEntry()],
    };
    const nuovoAttivo = makeProfilo({ id: 2, attivo: 1, nome_profilo: 'Nottambulo' });
    const next = reducer(s, {
      type: 'APPLY_CAMBIO_PROFILO',
      payload: {
        profiloAttivo: nuovoAttivo,
        profili: [makeProfilo({ id: 1, attivo: 0 }), nuovoAttivo],
        plan: [],
        lastBuiltForDay: '2026-04-18',
      },
    });
    expect(next.profiloAttivo.id).toBe(2);
    expect(next.plan).toEqual([]);
    expect(next.lastBuiltForDay).toBe('2026-04-18');
    expect(next.prompt).toBeNull();
    expect(next.presoStack).toEqual([]);
  });
});

describe('reducer — config edits', () => {
  it('SET_FARMACI sostituisce la lista farmaci', () => {
    const farmaci = [makeFarmaco({ id: 7, nome: 'Nuovo' })];
    const next = reducer(initialState, { type: 'SET_FARMACI', payload: farmaci });
    expect(next.farmaci).toBe(farmaci);
  });

  it('SET_ORARI sostituisce la lista orari', () => {
    const orari = [{ id: 99, farmaco_id: 7, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'sveglia' }];
    const next = reducer(initialState, { type: 'SET_ORARI', payload: orari });
    expect(next.orari).toBe(orari);
  });
});

describe('reducer — error channel', () => {
  it('SET_ERROR imposta l\'oggetto error fornito', () => {
    const err = { kind: 'domain', code: 'RECUPERO_INVALIDO', message: 'Recupero eccessivo' };
    const next = reducer(initialState, { type: 'SET_ERROR', payload: err });
    expect(next.error).toEqual(err);
  });

  it('CLEAR_ERROR azzera error', () => {
    const s = { ...initialState, error: { kind: 'repo', message: 'x' } };
    const next = reducer(s, { type: 'CLEAR_ERROR' });
    expect(next.error).toBeNull();
  });
});

describe('reducer — dev controls', () => {
  it('SET_SIMULATED_NOW imposta l\'orario simulato', () => {
    const next = reducer(initialState, { type: 'SET_SIMULATED_NOW', payload: '15:30' });
    expect(next.simulatedNow).toBe('15:30');
  });

  it('SET_SIMULATED_NOW accetta null per tornare a new Date()', () => {
    const s = { ...initialState, simulatedNow: '10:00' };
    const next = reducer(s, { type: 'SET_SIMULATED_NOW', payload: null });
    expect(next.simulatedNow).toBeNull();
  });

  it('SET_LAST_BUILT_FOR_DAY aggiorna lastBuiltForDay', () => {
    const next = reducer(initialState, {
      type: 'SET_LAST_BUILT_FOR_DAY', payload: '2026-04-19',
    });
    expect(next.lastBuiltForDay).toBe('2026-04-19');
  });
});

describe('reducer — default case', () => {
  it('azione sconosciuta ritorna lo stesso stato (referential equality)', () => {
    const next = reducer(initialState, { type: 'AZIONE_MAI_VISTA', payload: 'x' });
    expect(next).toBe(initialState);
  });
});

describe('reducer — invarianti', () => {
  it('SET_ERROR non tocca plan / profiloAttivo / farmaci', () => {
    const s = {
      ...initialState,
      plan: [makeEntry()],
      profiloAttivo: makeProfilo(),
      farmaci: [makeFarmaco()],
    };
    const next = reducer(s, {
      type: 'SET_ERROR',
      payload: { kind: 'repo', message: 'write failed' },
    });
    expect(next.plan).toBe(s.plan);
    expect(next.profiloAttivo).toBe(s.profiloAttivo);
    expect(next.farmaci).toBe(s.farmaci);
  });

  it('SET_SIMULATED_NOW non tocca plan / lastBuiltForDay / presoStack', () => {
    const s = {
      ...initialState,
      plan: [makeEntry()],
      lastBuiltForDay: '2026-04-18',
      presoStack: ['k1'],
    };
    const next = reducer(s, { type: 'SET_SIMULATED_NOW', payload: '14:00' });
    expect(next.plan).toBe(s.plan);
    expect(next.lastBuiltForDay).toBe(s.lastBuiltForDay);
    expect(next.presoStack).toBe(s.presoStack);
  });
});

// ============================================================
// SET_IMPOSTAZIONE (Sessione 7a, §6.27)
// ============================================================
describe('SET_IMPOSTAZIONE (Sessione 7a, §6.27)', () => {
  it('initialises impostazioni as {} and merges new keys without overwriting existing ones', () => {
    // Baseline: initialState seeds impostazioni as empty object.
    expect(initialState.impostazioni).toEqual({});

    const s1 = reducer(initialState, {
      type: 'SET_IMPOSTAZIONE',
      payload: { chiave: 'tema', valore: 'dark' },
    });
    expect(s1.impostazioni).toEqual({ tema: 'dark' });

    const s2 = reducer(s1, {
      type: 'SET_IMPOSTAZIONE',
      payload: { chiave: 'nome_utente', valore: 'Ada' },
    });
    expect(s2.impostazioni).toEqual({ tema: 'dark', nome_utente: 'Ada' });

    // Overwrite an existing key.
    const s3 = reducer(s2, {
      type: 'SET_IMPOSTAZIONE',
      payload: { chiave: 'tema', valore: 'light' },
    });
    expect(s3.impostazioni).toEqual({ tema: 'light', nome_utente: 'Ada' });
  });
});

// ============================================================
// REMOVE_PRESO_KEY (Sessione 7d-2 CP4, §6.62)
// ============================================================
describe('REMOVE_PRESO_KEY (Sessione 7d-2 CP4, §6.62)', () => {
  it('rimuove la key dal presoStack preservando ordine delle altre', () => {
    const s = { ...initialState, presoStack: ['k1', 'k2', 'k3'] };
    const next = reducer(s, { type: 'REMOVE_PRESO_KEY', payload: 'k2' });
    expect(next.presoStack).toEqual(['k1', 'k3']);
  });
});

// ============================================================
// §6.77 cleanup — state.nomeUtente mirror removal (Sessione 8a CP4)
// ============================================================
describe('cleanup §6.77 — legacy nomeUtente mirror rimosso', () => {
  it('initialState non espone più il campo nomeUtente', () => {
    expect(initialState).not.toHaveProperty('nomeUtente');
  });

  it('SET_NOME_UTENTE è un action type non più gestita → default case (no-op)', () => {
    // Post-cleanup the reducer has no dedicated branch. Dispatching
    // SET_NOME_UTENTE must hit the default case and return the SAME
    // state reference (referential equality), and must NOT introduce
    // a nomeUtente field onto the state.
    const next = reducer(initialState, { type: 'SET_NOME_UTENTE', payload: 'Giulia' });
    expect(next).toBe(initialState);
    expect(next).not.toHaveProperty('nomeUtente');
  });
});
