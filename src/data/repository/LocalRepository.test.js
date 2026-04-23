// @vitest-environment node
// ============================================================
// LocalRepository — unit tests.
// ============================================================
//
// Scope:
//   - Sessione 7d-2 CP1: getLogByDataStato (§6.40 / AMB-7d-2.C).
//   - Sessione 8a CP1:   withTransaction  (§6.64 / AMB-8a.B,
//                        rettifica F4: storeNames mapping).
//
// Strategy: mock `../db.js` with a minimal in-memory stub.
//   - log_assunzioni.where(field).equals(val).toArray()
//     supports getLogByDataStato (filter + sort logic under test).
//   - Other tables expose only a `.name` sentinel — enough to
//     assert that withTransaction maps storeNames → Table objects
//     before delegating to db.transaction.
//   - db.transaction is a spy that records (mode, tables, fn)
//     and invokes fn(), mimicking Dexie's pass-through contract.
//
// Node environment (vs jsdom): no DOM needed.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted: the factory runs BEFORE static imports, so the
// mutable store must be available at that point. Shared refs
// (arrays / object) are passed back for both mock closure and
// test-body assertions.
const { __rows, __txCalls, __mockDb } = vi.hoisted(() => {
  const __rows = [];
  const __txCalls = [];
  const __mockDb = {
    // Fake Dexie Table objects — only `.name` is needed for
    // withTransaction mapping assertions.
    farmaci:          { name: 'farmaci' },
    orari_base:       { name: 'orari_base' },
    profilo_utente:   { name: 'profilo_utente' },
    impostazioni_app: { name: 'impostazioni_app' },
    log_assunzioni: {
      name: 'log_assunzioni',
      where: (field) => ({
        equals: (val) => ({
          toArray: async () => __rows.filter((r) => r[field] === val),
        }),
      }),
    },
    transaction: async (mode, tables, fn) => {
      __txCalls.push({ mode, tables, fn });
      return await fn();
    },
  };
  return { __rows, __txCalls, __mockDb };
});

vi.mock('../db.js', () => ({ db: __mockDb }));

import { LocalRepository } from './LocalRepository.js';

// ============================================================
// getLogByDataStato — 7d-2 CP1 coverage (preserved verbatim).
// ============================================================

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

// ============================================================
// withTransaction — 8a CP1 coverage (§6.64 / AMB-8a.B + F4).
// ============================================================
//
// Contract under test:
//   withTransaction(mode, storeNames, fn)
//     - maps each storeName string to db[storeName] (Table object)
//     - delegates to db.transaction(mode, tables, fn)
//     - propagates fn's resolved value and rejected errors
//
// The spy captures the full (mode, tables, fn) tuple so we can
// assert that the Table-object mapping happens inside the repo
// method (rectifica F4) and NOT inside Dexie itself — the real
// Dexie 4 API would throw if handed raw strings.

describe('LocalRepository.withTransaction', () => {
  /** @type {LocalRepository} */
  let repo;

  beforeEach(() => {
    __txCalls.length = 0;
    repo = new LocalRepository();
  });

  it('delegates to db.transaction with mapped Table objects and returns fn result', async () => {
    const fn = async () => 'result-value';

    const out = await repo.withTransaction('rw', ['farmaci', 'orari_base'], fn);

    expect(__txCalls).toHaveLength(1);
    expect(__txCalls[0].mode).toBe('rw');
    // Mapping evidence: strings were resolved to Table objects
    // via db[storeName] BEFORE the call — Table identity preserved.
    expect(__txCalls[0].tables).toEqual([
      { name: 'farmaci' },
      { name: 'orari_base' },
    ]);
    expect(__txCalls[0].fn).toBe(fn);
    expect(out).toBe('result-value');
  });

  it('propagates errors thrown by fn', async () => {
    const fn = async () => { throw new Error('boom'); };

    await expect(
      repo.withTransaction('rw', ['farmaci'], fn)
    ).rejects.toThrow('boom');

    // The transaction was still attempted — the error comes from fn,
    // not from the mapping/delegation plumbing.
    expect(__txCalls).toHaveLength(1);
    expect(__txCalls[0].tables).toEqual([{ name: 'farmaci' }]);
  });
});
