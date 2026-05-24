// src/data/repository/ApiRepository.withTransaction.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 4 tests for client-side withTransaction orchestration.
// Best-effort: rollback NOT guaranteed multi-call (sub-AMB H par.22.90).
// Non-RepositoryError throws are wrapped in TRANSACTION_ABORT severity='critical'.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiRepository } from './ApiRepository.js';
import { RepositoryError } from './RepositoryError.js';

describe('ApiRepository.withTransaction (best-effort sub-AMB H par.22.90)', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('pharmatimer.userToken', 'test-token');
    repo = new ApiRepository();
  });

  // -------- 1: fn resolves -> passthrough --------
  it('fn resolves: returns fn value, mode and storeNames ignored', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: 42 });
    const result = await repo.withTransaction('rw', ['anyStore'], fn);
    expect(result).toEqual({ ok: 42 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // -------- 2: fn throws RepositoryError -> re-throw same instance --------
  it('fn throws RepositoryError: re-throws same instance without re-wrap', async () => {
    const original = new RepositoryError({
      code: 'NOT_FOUND',
      message: 'Foo non trovato',
    });
    const fn = vi.fn().mockRejectedValue(original);
    let caught;
    try {
      await repo.withTransaction('rw', [], fn);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBe(original);
    expect(caught.code).toBe('NOT_FOUND');
  });

  // -------- 3: fn throws plain Error -> wrap TRANSACTION_ABORT critical with cause --------
  it('fn throws plain Error: wraps TRANSACTION_ABORT severity=critical, cause preserved', async () => {
    const rawErr = new Error('something broke');
    const fn = vi.fn().mockRejectedValue(rawErr);
    let caught;
    try {
      await repo.withTransaction('rw', [], fn);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('TRANSACTION_ABORT');
    expect(caught.severity).toBe('critical');
    expect(caught.cause).toBe(rawErr);
  });

  // -------- 4: fn throws non-Error value -> graceful wrap --------
  it('fn throws non-Error value (string): wraps TRANSACTION_ABORT gracefully', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    let caught;
    try {
      await repo.withTransaction('rw', [], fn);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('TRANSACTION_ABORT');
    expect(caught.cause).toBe('string error');
  });
});
