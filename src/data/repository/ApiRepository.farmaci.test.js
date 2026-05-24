// src/data/repository/ApiRepository.farmaci.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 10 tests for Farmaci 5 API-routed methods + mappers.
// Mocks apiClient via vi.mock; verifies _fromApiFarmaco (bool->0/1, Decimal-string->number),
// _toApiFarmaco (strip server-managed fields + 0/1->bool), EMP-19 (soloAttivi ignored),
// EMP-20 (PUT full-replace 2-step fetch+merge), NOT_FOUND propagation on updateFarmaco.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ApiRepository } from './ApiRepository.js';
import { apiClient } from './apiClient.js';
import { RepositoryError } from './RepositoryError.js';

describe('ApiRepository Farmaci (5 API-routed + mappers)', () => {
  let repo;

  beforeEach(() => {
    vi.resetAllMocks();
    repo = new ApiRepository();
  });

  // -------- 1: getFarmaci maps via _fromApiFarmaco --------
  it('getFarmaci: maps bool attivo/demo to 0/1 and Decimal-string intervallo to number', async () => {
    apiClient.get.mockResolvedValue([
      {
        id: 1,
        nome: 'Aspirina',
        attivo: true,
        demo: false,
        intervallo_ore: '8.0',
        intervallo_minimo_ore: '4.0',
      },
    ]);
    const result = await repo.getFarmaci();
    expect(apiClient.get).toHaveBeenCalledWith('/api/farmaci');
    expect(result).toEqual([
      {
        id: 1,
        nome: 'Aspirina',
        attivo: 1,
        demo: 0,
        intervallo_ore: 8.0,
        intervallo_minimo_ore: 4.0,
      },
    ]);
  });

  // -------- 2: getFarmaci empty --------
  it('getFarmaci empty: returns []', async () => {
    apiClient.get.mockResolvedValue([]);
    const result = await repo.getFarmaci();
    expect(result).toEqual([]);
  });

  // -------- 3: getFarmaci ignores soloAttivi opts (EMP-19) --------
  it('getFarmaci({soloAttivi:true}): opts ignored, EMP-19 backend filters attivo=TRUE', async () => {
    apiClient.get.mockResolvedValue([]);
    await repo.getFarmaci({ soloAttivi: true });
    expect(apiClient.get).toHaveBeenCalledWith('/api/farmaci');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  // -------- 4: getFarmaco hit returns mapped --------
  it('getFarmaco hit: returns mapped object via list+filter', async () => {
    apiClient.get.mockResolvedValue([
      { id: 5, nome: 'Y', attivo: true, demo: false, intervallo_ore: '6.0' },
    ]);
    const result = await repo.getFarmaco(5);
    expect(result).toMatchObject({ id: 5, attivo: 1, intervallo_ore: 6.0 });
  });

  // -------- 5: getFarmaco miss returns null --------
  it('getFarmaco miss: returns null when not in list', async () => {
    apiClient.get.mockResolvedValue([]);
    const result = await repo.getFarmaco(99);
    expect(result).toBeNull();
  });

  // -------- 6: getFarmaco soft-deleted (backend filter attivo=TRUE) returns null --------
  it('getFarmaco soft-deleted: returns null (backend filters attivo=TRUE, EMP-19 asymmetry)', async () => {
    apiClient.get.mockResolvedValue([
      { id: 1, nome: 'A', attivo: true, demo: false, intervallo_ore: '8.0' },
    ]);
    const result = await repo.getFarmaco(99);
    expect(result).toBeNull();
  });

  // -------- 7: addFarmaco returns id + strips server-managed fields --------
  it('addFarmaco: returns server-assigned id; payload strips id/utente_id/created/updated + bool', async () => {
    apiClient.post.mockResolvedValue({ id: 42, nome: 'New' });
    const result = await repo.addFarmaco({
      id: 999,
      utente_id: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      nome: 'New',
      attivo: 1,
      demo: 0,
    });
    expect(result).toBe(42);
    const [url, payload] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci');
    expect(payload.id).toBeUndefined();
    expect(payload.utente_id).toBeUndefined();
    expect(payload.created_at).toBeUndefined();
    expect(payload.updated_at).toBeUndefined();
    expect(payload.attivo).toBe(true);
    expect(payload.demo).toBe(false);
    expect(payload.nome).toBe('New');
  });

  // -------- 8: updateFarmaco 2-step fetch+merge+PUT (EMP-20) --------
  it('updateFarmaco: 2-step fetch+merge+PUT full-replace (RFC 7231 EMP-20 par.22.91)', async () => {
    apiClient.get.mockResolvedValue([
      {
        id: 7,
        nome: 'Old',
        attivo: true,
        demo: false,
        intervallo_ore: '8.0',
        utente_id: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
    ]);
    apiClient.put.mockResolvedValue({ id: 7 });
    await repo.updateFarmaco(7, { nome: 'NewName' });
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    const [url, payload] = apiClient.put.mock.calls[0];
    expect(url).toBe('/api/farmaci/7');
    expect(payload.id).toBeUndefined();
    expect(payload.utente_id).toBeUndefined();
    expect(payload.created_at).toBeUndefined();
    expect(payload.updated_at).toBeUndefined();
    expect(payload.nome).toBe('NewName');
    expect(payload.attivo).toBe(true);
  });

  // -------- 9: updateFarmaco not found -> NOT_FOUND --------
  it('updateFarmaco not found: throws RepositoryError NOT_FOUND', async () => {
    apiClient.get.mockResolvedValue([]);
    let caught;
    try {
      await repo.updateFarmaco(99, { nome: 'X' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('NOT_FOUND');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  // -------- 10: deleteFarmaco soft-delete 204 --------
  it('deleteFarmaco: calls DELETE /api/farmaci/{id} (204 soft-delete server-side)', async () => {
    apiClient.delete.mockResolvedValue(null);
    await repo.deleteFarmaco(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/farmaci/7');
  });
});
