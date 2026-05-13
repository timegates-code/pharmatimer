import { describe, it, expect } from 'vitest';
import { selectAnchorEntry } from './selectors.js';

function makeEntry({ entryKey, dateStr, ora_prevista, stato = 'prevista', ora_ricalcolata = null }) {
  return {
    entryKey,
    farmaco_id: 1,
    farmaco_nome: 'TestFarmaco',
    dateStr,
    ora_prevista,
    ora_ricalcolata,
    stato,
    orario: { descrizione_momento: null },
  };
}

describe('selectAnchorEntry (§6.206 AMB-10.A÷E + 10.L)', () => {
  it('S1: mid-day mix returns latest in_ritardo (P1 max effHHMM)', () => {
    // now = 14:00 / 2026-05-13
    // 07:30 presa (excluded), 11:30 in_ritardo, 13:00 in_ritardo, 20:00 in_attesa
    // P1 catches {k2, k3}; max effMinutes = k3 (13:00=780)
    const state = {
      plan: [
        makeEntry({ entryKey: 'k1', dateStr: '2026-05-13', ora_prevista: '07:30', stato: 'presa' }),
        makeEntry({ entryKey: 'k2', dateStr: '2026-05-13', ora_prevista: '11:30' }),
        makeEntry({ entryKey: 'k3', dateStr: '2026-05-13', ora_prevista: '13:00' }),
        makeEntry({ entryKey: 'k4', dateStr: '2026-05-13', ora_prevista: '20:00' }),
      ],
    };
    const now = new Date(2026, 4, 13, 14, 0); // local TZ, May=month index 4
    const result = selectAnchorEntry(state, now);
    expect(result?.entryKey).toBe('k3');
  });

  it('S2: early morning all-pending returns earliest (P2 min effHHMM)', () => {
    // now = 06:00; all 3 entries are in_attesa (diff > 30); min effMinutes = k1 (07:30)
    const state = {
      plan: [
        makeEntry({ entryKey: 'k1', dateStr: '2026-05-13', ora_prevista: '07:30' }),
        makeEntry({ entryKey: 'k2', dateStr: '2026-05-13', ora_prevista: '12:00' }),
        makeEntry({ entryKey: 'k3', dateStr: '2026-05-13', ora_prevista: '20:00' }),
      ],
    };
    const now = new Date(2026, 4, 13, 6, 0);
    const result = selectAnchorEntry(state, now);
    expect(result?.entryKey).toBe('k1');
  });

  it('S3: end of day all closed returns null (P3 fallback)', () => {
    const state = {
      plan: [
        makeEntry({ entryKey: 'k1', dateStr: '2026-05-13', ora_prevista: '07:30', stato: 'presa' }),
        makeEntry({ entryKey: 'k2', dateStr: '2026-05-13', ora_prevista: '12:00', stato: 'presa' }),
        makeEntry({ entryKey: 'k3', dateStr: '2026-05-13', ora_prevista: '20:00', stato: 'saltata' }),
      ],
    };
    const now = new Date(2026, 4, 13, 23, 0);
    expect(selectAnchorEntry(state, now)).toBeNull();
  });

  it('S4: cross-midnight promoted entry excluded from today bucket (AMB-11.B.1)', () => {
    // entry.dateStr=2026-05-13 ma ora_ricalcolata='2026-05-14T01:00'
    // effectiveDateStr=2026-05-14 != resolvedNow.dateStr=2026-05-13 → escluso → null
    const state = {
      plan: [
        makeEntry({
          entryKey: 'k1',
          dateStr: '2026-05-13',
          ora_prevista: '23:00',
          ora_ricalcolata: '2026-05-14T01:00',
        }),
      ],
    };
    const now = new Date(2026, 4, 13, 22, 0);
    expect(selectAnchorEntry(state, now)).toBeNull();
  });

  it('S5: saltata does not contribute, returns next pending prossima', () => {
    // now = 09:00 (=540 min); k1 saltata (excluded via getCardState early return);
    // k2 ora_prevista=09:15 (=555); diff=15; !< -15 e !> 30 → 'prossima' → P2 match
    const state = {
      plan: [
        makeEntry({ entryKey: 'k1', dateStr: '2026-05-13', ora_prevista: '07:30', stato: 'saltata' }),
        makeEntry({ entryKey: 'k2', dateStr: '2026-05-13', ora_prevista: '09:15' }),
      ],
    };
    const now = new Date(2026, 4, 13, 9, 0);
    const result = selectAnchorEntry(state, now);
    expect(result?.entryKey).toBe('k2');
  });
});
