// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { selectCountersForDay } from './selectors.js';

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
