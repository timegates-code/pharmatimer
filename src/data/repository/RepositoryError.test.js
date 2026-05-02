// src/data/repository/RepositoryError.test.js
//
// CP1a (Step 11-A): unit tests for the typed repository error class.
// Covers: shape, severity defaults, wrap idempotency, classify heuristic,
// SET_ERROR payload backward-compat with reducer { kind: 'repo', message }.

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  RepositoryError,
  SEVERITY_BY_CODE,
  SEVERITY_VALUES,
  wrapRepoError,
  classifyRawError,
} from './RepositoryError.js';

describe('RepositoryError class', () => {
  it('extends Error so instanceof Error remains true', () => {
    const err = new RepositoryError({ code: 'GENERIC', message: 'boom' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.name).toBe('RepositoryError');
  });

  it('assigns default severity from SEVERITY_BY_CODE map', () => {
    expect(new RepositoryError({ code: 'DB_UNAVAILABLE' }).severity).toBe('critical');
    expect(new RepositoryError({ code: 'TRANSACTION_ABORT' }).severity).toBe('critical');
    expect(new RepositoryError({ code: 'CONSTRAINT_VIOLATION' }).severity).toBe('error');
    expect(new RepositoryError({ code: 'NOT_FOUND' }).severity).toBe('warning');
    expect(new RepositoryError({ code: 'GENERIC' }).severity).toBe('error');
  });

  it('falls back to severity error for unknown codes', () => {
    const err = new RepositoryError({ code: 'UNKNOWN_FUTURE_CODE' });
    expect(err.severity).toBe('error');
  });

  it('explicit severity overrides the default for the code', () => {
    const err = new RepositoryError({ code: 'NOT_FOUND', severity: 'critical' });
    expect(err.severity).toBe('critical');
  });

  it('preserves cause when provided', () => {
    const raw = new Error('underlying');
    const err = new RepositoryError({ code: 'GENERIC', message: 'wrapped', cause: raw });
    expect(err.cause).toBe(raw);
  });

  it('toPayload returns reducer-compatible shape with kind=repo', () => {
    const err = new RepositoryError({
      code: 'CONSTRAINT_VIOLATION',
      message: 'duplicato',
    });
    const payload = err.toPayload();
    expect(payload).toEqual({
      kind: 'repo',
      code: 'CONSTRAINT_VIOLATION',
      severity: 'error',
      message: 'duplicato',
    });
  });

  it('default constructor (no opts) produces GENERIC severity error', () => {
    const err = new RepositoryError();
    expect(err.code).toBe('GENERIC');
    expect(err.severity).toBe('error');
    expect(err.message).toBe('Errore repository');
  });
});

describe('SEVERITY_VALUES contract', () => {
  it('contains exactly the three AMB-11.A.2 levels', () => {
    expect([...SEVERITY_VALUES]).toEqual(['warning', 'error', 'critical']);
  });

  it('all SEVERITY_BY_CODE values are members of SEVERITY_VALUES', () => {
    for (const sev of Object.values(SEVERITY_BY_CODE)) {
      expect(SEVERITY_VALUES).toContain(sev);
    }
  });
});

describe('wrapRepoError', () => {
  it('produces a RepositoryError from a raw Error', () => {
    const raw = new Error('IDB exploded');
    const wrapped = wrapRepoError(raw, 'DB_UNAVAILABLE');
    expect(wrapped).toBeInstanceOf(RepositoryError);
    expect(wrapped.code).toBe('DB_UNAVAILABLE');
    expect(wrapped.severity).toBe('critical');
    expect(wrapped.message).toBe('IDB exploded');
    expect(wrapped.cause).toBe(raw);
  });

  it('uses provided message override when supplied', () => {
    const raw = new Error('cryptic stack');
    const wrapped = wrapRepoError(raw, 'GENERIC', 'Errore durante salvataggio');
    expect(wrapped.message).toBe('Errore durante salvataggio');
    expect(wrapped.cause).toBe(raw);
  });

  it('is idempotent: wrapping a RepositoryError returns the same instance', () => {
    const original = new RepositoryError({ code: 'NOT_FOUND', message: 'x' });
    const rewrapped = wrapRepoError(original, 'GENERIC');
    expect(rewrapped).toBe(original);
    expect(rewrapped.code).toBe('NOT_FOUND');
  });

  it('handles non-Error values (string, null, undefined) gracefully', () => {
    const w1 = wrapRepoError('plain string', 'GENERIC');
    expect(w1.message).toBe('Errore repository');
    expect(w1.cause).toBe('plain string');

    const w2 = wrapRepoError(null, 'GENERIC');
    expect(w2.message).toBe('Errore repository');

    const w3 = wrapRepoError(undefined, 'GENERIC');
    expect(w3.message).toBe('Errore repository');
  });

  it('explicit severity argument overrides code default', () => {
    const wrapped = wrapRepoError(new Error('x'), 'NOT_FOUND', undefined, 'error');
    expect(wrapped.severity).toBe('error');
  });
});

describe('classifyRawError heuristic', () => {
  it('maps Dexie database errors to DB_UNAVAILABLE', () => {
    expect(classifyRawError({ name: 'DatabaseClosedError' })).toBe('DB_UNAVAILABLE');
    expect(classifyRawError({ name: 'InvalidStateError' })).toBe('DB_UNAVAILABLE');
    expect(classifyRawError({ name: 'VersionError' })).toBe('DB_UNAVAILABLE');
    expect(classifyRawError({ name: 'UnknownError' })).toBe('DB_UNAVAILABLE');
  });

  it('maps Dexie transaction errors to TRANSACTION_ABORT', () => {
    expect(classifyRawError({ name: 'AbortError' })).toBe('TRANSACTION_ABORT');
    expect(classifyRawError({ name: 'TransactionInactiveError' })).toBe('TRANSACTION_ABORT');
  });

  it('maps Dexie constraint errors to CONSTRAINT_VIOLATION', () => {
    expect(classifyRawError({ name: 'ConstraintError' })).toBe('CONSTRAINT_VIOLATION');
    expect(classifyRawError({ name: 'DataError' })).toBe('CONSTRAINT_VIOLATION');
  });

  it('falls back to GENERIC for unknown error names', () => {
    expect(classifyRawError({ name: 'WeirdError' })).toBe('GENERIC');
    expect(classifyRawError({})).toBe('GENERIC');
    expect(classifyRawError(null)).toBe('GENERIC');
    expect(classifyRawError(undefined)).toBe('GENERIC');
    expect(classifyRawError('string')).toBe('GENERIC');
  });
});
