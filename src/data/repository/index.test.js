// src/data/repository/index.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 3 tests for runtime toggle ApiRepository vs LocalRepository.
// Toggle via localStorage flag 'pharmatimer.useApiRepo' = '1', lazy singleton init.
// Test pattern: vi.resetModules() + await import() to force re-evaluation of singleton.

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('repository factory toggle (par.22.90 sub-AMB O + EMP-1)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('default (no flag): getRepository returns LocalRepository instance', async () => {
    const { getRepository } = await import('./index.js');
    const { LocalRepository } = await import('./LocalRepository.js');
    const repo = getRepository();
    expect(repo).toBeInstanceOf(LocalRepository);
  });

  it('flag = "1": getRepository returns ApiRepository instance after vi.resetModules', async () => {
    localStorage.setItem('pharmatimer.useApiRepo', '1');
    const { getRepository } = await import('./index.js');
    const { ApiRepository } = await import('./ApiRepository.js');
    const { SyncRepository } = await import('./SyncRepository.js');
    const repo = getRepository();
    // SENTINEL_PAR_22_198_SEXVICIES_INDEX_TEST_FLAG -- CS-3: il factory
    // restituisce il guardiano SyncRepository che avvolge ApiRepository
    // sul ramo API (flag localStorage). Intento originale preservato.
    expect(repo).toBeInstanceOf(SyncRepository);
    expect(repo._api).toBeInstanceOf(ApiRepository);
  });

  it('singleton: two calls to getRepository return the same instance (lazy memoized)', async () => {
    const { getRepository } = await import('./index.js');
    const r1 = getRepository();
    const r2 = getRepository();
    expect(r1).toBe(r2);
  });

  // SENTINEL_N5QC_CP1_TEST_VITE_USE_API -- Q-W.1/Q-W.2: env-driven gate (build Mini), nessun flag localStorage.
  it('env VITE_USE_API=1 (no localStorage flag): getRepository returns ApiRepository', async () => {
    vi.stubEnv('VITE_USE_API', '1');
    const { getRepository } = await import('./index.js');
    const { ApiRepository } = await import('./ApiRepository.js');
    const { SyncRepository } = await import('./SyncRepository.js');
    const repo = getRepository();
    // SENTINEL_PAR_22_198_SEXVICIES_INDEX_TEST_ENV -- CS-3: idem, ramo
    // env VITE_USE_API. Intento originale (repo API cablata) preservato.
    expect(repo).toBeInstanceOf(SyncRepository);
    expect(repo._api).toBeInstanceOf(ApiRepository);
  });
});
