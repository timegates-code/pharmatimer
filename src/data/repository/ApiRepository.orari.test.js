// src/data/repository/ApiRepository.orari.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 10 tests for Orari 6 API-routed methods.
// Mocks apiClient via vi.mock; verifies fan-out 1+N getAllOrari, fail-fast,
// add/update/delete via bulk PUT replace (sub-AMB G par.22.90), _stripOrarioServerFields.

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

describe('ApiRepository Orari (6 API-routed via nested + bulk-replace)', () => {
  let repo;

  beforeEach(() => {
    vi.resetAllMocks();
    repo = new ApiRepository();
  });

  // -------- 1: getOrariByFarmaco returns array --------
  it('getOrariByFarmaco: GET /api/farmaci/{fid}/orari returns array', async () => {
    apiClient.get.mockResolvedValue([
      { id: 1, farmaco_id: 42, dose_numero: 1, ora_prevista: '08:00' },
      { id: 2, farmaco_id: 42, dose_numero: 2, ora_prevista: '20:00' },
    ]);
    const result = await repo.getOrariByFarmaco(42);
    expect(apiClient.get).toHaveBeenCalledWith('/api/farmaci/42/orari');
    expect(result.length).toBe(2);
  });

  // -------- 2: getOrariByFarmaco empty --------
  it('getOrariByFarmaco empty: returns []', async () => {
    apiClient.get.mockResolvedValue([]);
    const result = await repo.getOrariByFarmaco(42);
    expect(result).toEqual([]);
  });

  // -------- 3: getAllOrari fan-out 1+N --------
  it('getAllOrari: fan-out 1+N (getFarmaci + per-farmaco orari) flatten merge', async () => {
    // First call = getFarmaci, then 2 per-farmaco orari calls
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
        { id: 2, attivo: true, demo: false, intervallo_ore: '6.0' },
      ])
      .mockResolvedValueOnce([{ id: 10, farmaco_id: 1, dose_numero: 1 }])
      .mockResolvedValueOnce([
        { id: 20, farmaco_id: 2, dose_numero: 1 },
        { id: 21, farmaco_id: 2, dose_numero: 2 },
      ]);
    const result = await repo.getAllOrari();
    expect(apiClient.get).toHaveBeenCalledTimes(3);
    expect(result.length).toBe(3);
    expect(result.map((o) => o.id).sort()).toEqual([10, 20, 21]);
  });

  // -------- 4: getAllOrari fan-out fail-fast --------
  it('getAllOrari: fail-fast on first reject (Promise.all semantics)', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockRejectedValueOnce(
        new RepositoryError({ code: 'NOT_FOUND', message: 'farmaco 1 sparito' })
      );
    let caught;
    try {
      await repo.getAllOrari();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('NOT_FOUND');
  });

  // -------- 5: getAllOrari empty farmaci -> empty orari, no fan-out --------
  it('getAllOrari: empty farmaci returns [] with zero per-farmaco calls', async () => {
    apiClient.get.mockResolvedValue([]);
    const result = await repo.getAllOrari();
    expect(result).toEqual([]);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  // -------- 6: addOrario fetch+append+PUT+refetch -> server id --------
  it('addOrario: fetch current + append + bulk PUT + refetch returns server-assigned id', async () => {
    apiClient.get
      .mockResolvedValueOnce([{ id: 10, farmaco_id: 1, dose_numero: 1, ora_prevista: '08:00' }])
      .mockResolvedValueOnce([
        { id: 10, farmaco_id: 1, dose_numero: 1, ora_prevista: '08:00' },
        { id: 11, farmaco_id: 1, dose_numero: 2, ora_prevista: '20:00' },
      ]);
    apiClient.put.mockResolvedValue(null);
    const newId = await repo.addOrario({
      farmaco_id: 1,
      dose_numero: 2,
      ora_prevista: '20:00',
    });
    expect(newId).toBe(11);
    expect(apiClient.put).toHaveBeenCalledTimes(1);
  });

  // -------- 7: updateOrario cross-farmaco lookup + bulk PUT --------
  it('updateOrario: cross-farmaco lookup via getAllOrari + bulk PUT merged+stripped', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockResolvedValueOnce([
        { id: 10, farmaco_id: 1, dose_numero: 1, ora_prevista: '08:00' },
        { id: 11, farmaco_id: 1, dose_numero: 2, ora_prevista: '20:00' },
      ]);
    apiClient.put.mockResolvedValue(null);
    await repo.updateOrario(10, { ora_prevista: '09:00' });
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    const [url, payload] = apiClient.put.mock.calls[0];
    expect(url).toBe('/api/farmaci/1/orari');
    expect(payload.length).toBe(2);
    const updated = payload.find((p) => p.dose_numero === 1);
    expect(updated.ora_prevista).toBe('09:00');
    expect(updated.id).toBeUndefined();
    expect(updated.farmaco_id).toBeUndefined();
  });

  // -------- 8: updateOrario not found -> NOT_FOUND --------
  it('updateOrario not found: throws RepositoryError NOT_FOUND, no PUT', async () => {
    apiClient.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    let caught;
    try {
      await repo.updateOrario(999, { ora_prevista: '10:00' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('NOT_FOUND');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  // -------- 9: deleteOrario filter out + bulk PUT --------
  it('deleteOrario: filters out target id and bulk PUT remaining', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockResolvedValueOnce([
        { id: 10, farmaco_id: 1, dose_numero: 1, ora_prevista: '08:00' },
        { id: 11, farmaco_id: 1, dose_numero: 2, ora_prevista: '20:00' },
      ]);
    apiClient.put.mockResolvedValue(null);
    await repo.deleteOrario(10);
    const [url, payload] = apiClient.put.mock.calls[0];
    expect(url).toBe('/api/farmaci/1/orari');
    expect(payload.length).toBe(1);
    expect(payload[0].dose_numero).toBe(2);
  });

  // -------- 10: replaceOrariForFarmaco strips server fields --------
  it('replaceOrariForFarmaco: strips id/utente_id/farmaco_id from payload', async () => {
    apiClient.put.mockResolvedValue(null);
    await repo.replaceOrariForFarmaco(5, [
      { id: 99, utente_id: 1, farmaco_id: 5, dose_numero: 1, ora_prevista: '07:00' },
      { dose_numero: 2, ora_prevista: '19:00' },
    ]);
    const [url, payload] = apiClient.put.mock.calls[0];
    expect(url).toBe('/api/farmaci/5/orari');
    expect(payload.length).toBe(2);
    payload.forEach((p) => {
      expect(p.id).toBeUndefined();
      expect(p.utente_id).toBeUndefined();
      expect(p.farmaco_id).toBeUndefined();
    });
  });
});
