// @vitest-environment node
// ============================================================
// LocalRepository — unit tests.
// ============================================================
//
// Scope Sessione 7d-2 CP1: getLogByDataStato (§6.40 / AMB-7d-2.C).
//
// Strategy: mock `../db.js` with a minimal in-memory stub that
// supports the single chain used by getLogByDataStato:
//   db.log_assunzioni.where(field).equals(value).toArray()
//
// This keeps the test focused on the method's JS logic (filter +
// sort) without the cost of fake-indexeddb + real Dexie schema
// setup. When/if other repo methods gain unit tests, this file
// can be extended by widening the mock surface or switching to
// fake-indexeddb.
//
// Node environment (vs jsdom): no DOM needed.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted: the factory below runs BEFORE static imports, so the
// mutable store must be available at that point. Using vi.hoisted
// is the idiomatic way to share state between a hoisted vi.mock
// factory and test bodies.
const { __rows } = vi.hoisted(() => ({ __rows: [] }));

vi.mock('../db.js', () => ({
  db: {
    log_assunzioni: {
      where: (field) => ({
        equals: (val) => ({
          toArray: async () => __rows.filter((r) => r[field] === val),
        }),
      }),
    },
  },
}));

import { LocalRepository } from './LocalRepository.js';

describe('LocalRepository.getLogByDataStato', () => {
  /** @type {LocalRepository} */
  let repo;

  beforeEach(() => {
    __rows.length = 0;
    repo = new LocalRepository();
  });

  it('returns logs filtered by (data, stato), ordered ASC by ora_effettiva', async () => {
    __rows.push(
      // 3 matching rows — intentionally out of order to exercise sort.
      { id: 1, farmaco_id: 1, data: '2026-04-21', dose_numero: 2, ora_effettiva: '12:05', stato: 'presa' },
      { id: 2, farmaco_id: 1, data: '2026-04-21', dose_numero: 1, ora_effettiva: '08:02', stato: 'presa' },
      { id: 3, farmaco_id: 2, data: '2026-04-21', dose_numero: 1, ora_effettiva: '09:30', stato: 'presa' },
      // Excluded: right day, wrong stato.
      { id: 4, farmaco_id: 3, data: '2026-04-21', dose_numero: 1, ora_effettiva: null, stato: 'saltata' },
      // Excluded: wrong day.
      { id: 5, farmaco_id: 1, data: '2026-04-20', dose_numero: 1, ora_effettiva: '08:00', stato: 'presa' },
    );

    const out = await repo.getLogByDataStato('2026-04-21', 'presa');

    expect(out).toHaveLength(3);
    // Ordered by ora_effettiva ASC: 08:02 → 09:30 → 12:05.
    expect(out.map((r) => r.id)).toEqual([2, 3, 1]);
    expect(out.every((r) => r.stato === 'presa')).toBe(true);
    expect(out.every((r) => r.data === '2026-04-21')).toBe(true);
  });

  it('returns an empty array when no rows match', async () => {
    __rows.push(
      { id: 1, farmaco_id: 1, data: '2026-04-20', dose_numero: 1, ora_effettiva: '08:00', stato: 'presa' },
    );

    const out = await repo.getLogByDataStato('2026-04-21', 'presa');

    expect(out).toEqual([]);
  });
});
