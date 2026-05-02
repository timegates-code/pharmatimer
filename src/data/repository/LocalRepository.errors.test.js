// src/data/repository/LocalRepository.errors.test.js
//
// CP1a Step 11-A (AMB-11.A.1/2): tests for the RepositoryError wrapping
// applied across LocalRepository methods. Companion to the existing
// LocalRepository.test.js (which covers happy-path behavior of
// getLogByDataStato + withTransaction).
//
// Scope of this file: error-path coverage only.
//   1. _wrap idempotency on RepositoryError (propagates unchanged)
//   2. _wrap classification of raw Dexie errors (DatabaseClosedError → DB_UNAVAILABLE)
//   3. _wrap codeOverride forces a specific code regardless of cause
//   4. deleteProfilo on the active profile throws CONSTRAINT_VIOLATION/warning

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RepositoryError } from './RepositoryError.js';

// Mock the db module BEFORE importing LocalRepository, so the singleton
// import resolves to our controlled fake. Each test then re-mocks the
// specific table methods it exercises via vi.spyOn / direct reassign.
vi.mock('../db.js', () => {
  return {
    db: {
      profilo_utente: {
        get: vi.fn(),
        orderBy: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

// Imported AFTER vi.mock so the mocked db is wired in.
const { LocalRepository } = await import('./LocalRepository.js');
const { db } = await import('../db.js');

describe('LocalRepository._wrap (CP1a)', () => {
  /** @type {LocalRepository} */
  let repo;

  beforeEach(() => {
    repo = new LocalRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('idempotency: a RepositoryError thrown inside fn propagates unchanged', async () => {
    const original = new RepositoryError({
      code: 'NOT_FOUND',
      severity: 'warning',
      message: 'gia tipizzato',
    });
    let thrown;
    try {
      await repo._wrap(async () => {
        throw original;
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBe(original);
    expect(thrown.code).toBe('NOT_FOUND');
    expect(thrown.severity).toBe('warning');
  });

  it('classifies a Dexie DatabaseClosedError as DB_UNAVAILABLE/critical', async () => {
    const raw = Object.assign(new Error('Database is closed'), {
      name: 'DatabaseClosedError',
    });
    let thrown;
    try {
      await repo._wrap(async () => {
        throw raw;
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown.code).toBe('DB_UNAVAILABLE');
    expect(thrown.severity).toBe('critical');
    expect(thrown.cause).toBe(raw);
  });

  it('codeOverride forces the specified code regardless of raw error name', async () => {
    const raw = Object.assign(new Error('inner'), { name: 'ConstraintError' });
    // classifyRawError would map this to CONSTRAINT_VIOLATION; codeOverride wins.
    let thrown;
    try {
      await repo._wrap(async () => {
        throw raw;
      }, 'TRANSACTION_ABORT');
    } catch (e) {
      thrown = e;
    }
    expect(thrown.code).toBe('TRANSACTION_ABORT');
    expect(thrown.severity).toBe('critical');
  });
});

describe('LocalRepository.deleteProfilo error path (CP1a)', () => {
  /** @type {LocalRepository} */
  let repo;

  beforeEach(() => {
    repo = new LocalRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws CONSTRAINT_VIOLATION/warning when target is the active profile', async () => {
    // Active profile present in db.
    db.profilo_utente.get.mockResolvedValueOnce({ id: 1, attivo: 1 });
    db.profilo_utente.delete.mockResolvedValueOnce(undefined);

    let thrown;
    try {
      await repo.deleteProfilo(1);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown.code).toBe('CONSTRAINT_VIOLATION');
    expect(thrown.severity).toBe('warning');
    expect(thrown.message).toBe(
      'Non si può eliminare il profilo attivo. Attivane un altro prima.'
    );
    // Must NOT have called delete (early return on business rule).
    expect(db.profilo_utente.delete).not.toHaveBeenCalled();
  });
});
