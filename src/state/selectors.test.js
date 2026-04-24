// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  selectCountersForDay,
  selectUltimaPresa,
  selectEntryByKey,
  selectPromptEntry,
} from './selectors.js';

// Minimal state factory — selectCountersForDay reads only `plan` and
// `simulatedNow`. No reducer wiring needed.
function mkState(plan, simulatedNow = null) {
  return {
    plan: plan ?? [],
    simulatedNow,
  };
}

// Minimal plan-entry factory aligned with the fields the selector reads.
function mkEntry(over = {}) {
  return {
    key: 'x',
    dateStr: '2026-04-19',
    farmaco: { id: 1 },
    orario: { dose_numero: 1 },
    ora_prevista: '10:00',
    ora_ricalcolata: null,
    stato: 'prevista',
    ...over,
  };
}

// Deterministic "now": 2026-04-19 at 10:00 local → dateStr='2026-04-19',
// minutes = 600. Passed to resolveNow(state, REF) as referenceDate; since
// state.simulatedNow is null, the reference is used verbatim.
const REF = new Date('2026-04-19T10:00:00');

describe('selectCountersForDay', () => {
  it('returns all zeros / null for an empty plan on the target day', () => {
    const out = selectCountersForDay(mkState([]), '2026-04-19', REF);
    expect(out).toEqual({
      presi: 0,
      saltate: 0,
      sospese: 0,
      inRitardo: 0,
      prossimoIn: null,
      restanti: 0,
    });
  });

  it('counts presi/saltate/sospese only from entries matching dateStr', () => {
    const plan = [
      mkEntry({ key: 'a', stato: 'presa' }),
      mkEntry({ key: 'b', stato: 'saltata' }),
      mkEntry({ key: 'c', stato: 'sospesa' }),
      mkEntry({ key: 'd', stato: 'presa', dateStr: '2026-04-20' }), // other day, ignored
    ];
    const out = selectCountersForDay(mkState(plan), '2026-04-19', REF);
    expect(out.presi).toBe(1);
    expect(out.saltate).toBe(1);
    expect(out.sospese).toBe(1);
    expect(out.restanti).toBe(0);
    expect(out.inRitardo).toBe(0);
  });

  it('flags inRitardo only past TOLLERANZA_MIN (boundary: -15 min is restanti, -16 min is inRitardo)', () => {
    // At REF=10:00 → nowMin=600. Threshold: doseMin < 600 - 15 = 585 → inRitardo.
    const plan = [
      mkEntry({ key: 'a', ora_prevista: '09:45' }), // doseMin=585 → NOT inRitardo
      mkEntry({ key: 'b', ora_prevista: '09:44' }), // doseMin=584 → inRitardo
    ];
    const out = selectCountersForDay(mkState(plan), '2026-04-19', REF);
    expect(out.inRitardo).toBe(1);
    expect(out.restanti).toBe(1);
  });

  it('treats ricalcolata as pending and uses ora_ricalcolata for the temporal check', () => {
    const plan = [
      // ricalcolata way in the past → inRitardo
      mkEntry({
        key: 'a', stato: 'ricalcolata',
        ora_prevista: '09:00', ora_ricalcolata: '08:00',
      }),
      // prevista in the future → restanti
      mkEntry({ key: 'b', stato: 'prevista', ora_prevista: '11:00' }),
    ];
    const out = selectCountersForDay(mkState(plan), '2026-04-19', REF);
    expect(out.inRitardo).toBe(1);
    expect(out.restanti).toBe(1);
  });

  it('computes prossimoIn as minutes to the earliest pending dose >= nowMin', () => {
    const plan = [
      mkEntry({ key: 'a', stato: 'presa', ora_prevista: '08:00' }),    // taken, skipped
      mkEntry({ key: 'b', stato: 'prevista', ora_prevista: '11:30' }), // +90 min
      mkEntry({ key: 'c', stato: 'prevista', ora_prevista: '14:00' }), // later
    ];
    const out = selectCountersForDay(mkState(plan), '2026-04-19', REF);
    expect(out.prossimoIn).toBe(90);
  });

  it('suppresses temporal fields when dateStr differs from resolved today', () => {
    // Asking for tomorrow's counters while now is 2026-04-19 10:00.
    const plan = [
      mkEntry({ key: 'a', dateStr: '2026-04-20', ora_prevista: '09:00', stato: 'prevista' }),
    ];
    const out = selectCountersForDay(mkState(plan), '2026-04-20', REF);
    expect(out.inRitardo).toBe(0);
    expect(out.prossimoIn).toBeNull();
    expect(out.restanti).toBe(1); // pending still counted, just not classified
  });
});

describe('selectUltimaPresa', () => {
  it('returns null when presoStack is empty', () => {
    const state = { presoStack: [] };
    expect(selectUltimaPresa(state)).toBeNull();
  });

  it('returns the key at the top of the stack (most recent push) when presoStack has entries', () => {
    // Push order: k1 → k2 → k3. Top = 'k3'.
    const state = { presoStack: ['k1', 'k2', 'k3'] };
    expect(selectUltimaPresa(state)).toBe('k3');
  });
});

describe('selectEntryByKey', () => {
  it('returns the matching entry or null (miss / hit / absent plan)', () => {
    const plan = [
      mkEntry({ key: 'a', stato: 'prevista' }),
      mkEntry({ key: 'b', stato: 'presa', ora_prevista: '12:00' }),
    ];
    // Hit.
    const hit = selectEntryByKey(mkState(plan), 'b');
    expect(hit).not.toBeNull();
    expect(hit.key).toBe('b');
    expect(hit.stato).toBe('presa');
    // Miss on a populated plan.
    expect(selectEntryByKey(mkState(plan), 'z')).toBeNull();
    // Empty plan.
    expect(selectEntryByKey(mkState([]), 'a')).toBeNull();
    // Falsy entryKey.
    expect(selectEntryByKey(mkState(plan), '')).toBeNull();
    expect(selectEntryByKey(mkState(plan), null)).toBeNull();
  });
});

describe('selectPromptEntry', () => {
  it('returns null when state.prompt is absent/null or has no entryKey', () => {
    const plan = [mkEntry({ key: 'a' })];
    // prompt field missing altogether (initial state).
    expect(selectPromptEntry(mkState(plan))).toBeNull();
    // prompt explicitly null (post-dismiss).
    expect(
      selectPromptEntry({ ...mkState(plan), prompt: null })
    ).toBeNull();
    // prompt object present but without entryKey (defensive: malformed payload).
    expect(
      selectPromptEntry({ ...mkState(plan), prompt: { kind: 'gap_recovery' } })
    ).toBeNull();
    // entryKey empty string (falsy gate).
    expect(
      selectPromptEntry({
        ...mkState(plan),
        prompt: { kind: 'gap_recovery', entryKey: '' },
      })
    ).toBeNull();
  });

  it('hydrates via selectEntryByKey: returns the entry on hit, null on stale-key miss', () => {
    const plan = [
      mkEntry({ key: 'a', stato: 'prevista' }),
      mkEntry({ key: 'b', stato: 'ricalcolata', ora_ricalcolata: '11:30' }),
    ];
    // Hit: entryKey matches a plan entry.
    const hit = selectPromptEntry({
      ...mkState(plan),
      prompt: { kind: 'gap_recovery', entryKey: 'b' },
    });
    expect(hit).not.toBeNull();
    expect(hit.key).toBe('b');
    expect(hit.stato).toBe('ricalcolata');
    // Miss: entryKey points to an entry that is not (or no longer) in plan.
    // Robustness: null, not throw.
    expect(
      selectPromptEntry({
        ...mkState(plan),
        prompt: { kind: 'gap_recovery', entryKey: 'ghost' },
      })
    ).toBeNull();
  });
});

// ============================================================
// Profili selectors (Sessione 8b CP3 / AMB-8b.K)
// ============================================================

import {
  selectProfili,
  selectProfiloAttivo,
  selectProfiloById,
} from './selectors.js';

describe('selectProfili / selectProfiloAttivo / selectProfiloById', () => {
  const P1 = {
    id: 1, nome_profilo: 'Standard',
    ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
    attivo: 1,
  };
  const P2 = {
    id: 2, nome_profilo: 'Nottambulo',
    ora_sveglia: '10:00', ora_colazione: '10:30',
    ora_pranzo: '14:30', ora_cena: '21:30', ora_sonno: '02:00',
    attivo: 0,
  };

  it('selectProfili ritorna state.profili verbatim', () => {
    const state = { profili: [P1, P2] };
    expect(selectProfili(state)).toBe(state.profili);
  });

  it('selectProfiloAttivo ritorna state.profiloAttivo (oggetto o null)', () => {
    expect(selectProfiloAttivo({ profiloAttivo: P1 })).toBe(P1);
    expect(selectProfiloAttivo({ profiloAttivo: null })).toBeNull();
  });

  it('selectProfiloById trova per id, ritorna null su miss', () => {
    const state = { profili: [P1, P2] };
    expect(selectProfiloById(state, 2)).toBe(P2);
    expect(selectProfiloById(state, 999)).toBeNull();
  });
});

// ============================================================
// Farmaci selectors (Sessione 8c-2 CP5 / AMB-8c-2.C)
// ============================================================

import { selectFarmacoById } from './selectors.js';

describe('selectFarmacoById', () => {
  const F1 = { id: 1, nome: 'Pantorc 40mg', attivo: 1 };
  const F2 = { id: 2, nome: 'Ezevast 10mg', attivo: 1 };

  it('trova per id, ritorna null su miss, gestisce state.farmaci assente', () => {
    const state = { farmaci: [F1, F2] };
    expect(selectFarmacoById(state, 2)).toBe(F2);
    expect(selectFarmacoById(state, 999)).toBeNull();
    // Defensive: state.farmaci absent (very-early render).
    expect(selectFarmacoById({}, 1)).toBeNull();
  });
});
