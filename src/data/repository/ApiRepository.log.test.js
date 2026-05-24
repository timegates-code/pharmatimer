// src/data/repository/ApiRepository.log.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 18 tests for Log assunzioni 9 methods.
// Covers: state-machine dispatch 5 verbi (sub-AMB A par.22.90), atomic detect [presa@D,
// ricalcolata@D+1] (sub-AMB J), fan-out getLogByRange cross-farmaci (sub-AMB B),
// EMP-21 HH:MM -> ISO datetime coercion, throw GENERIC for updateLog/deleteLog (sub-AMB N+O).

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

describe('ApiRepository Log assunzioni (dispatch + fan-out + atomic batch)', () => {
  let repo;

  beforeEach(() => {
    vi.resetAllMocks();
    repo = new ApiRepository();
  });

  // -------- 1: upsertLog presa with HH:MM coerced to ISO --------
  it('upsertLog presa: HH:MM ora_effettiva combined with data into ISO datetime (EMP-21)', async () => {
    apiClient.post.mockResolvedValue({ id: 100 });
    await repo.upsertLog(42, '2026-05-24', 1, {
      stato: 'presa',
      ora_prevista: '08:00',
      ora_effettiva: '08:30',
      delta_minuti: 30,
      gap_minuti: 0,
    });
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/presa');
    expect(body.ora_effettiva).toBe('2026-05-24T08:30:00');
    expect(body.data).toBe('2026-05-24');
    expect(body.dose_numero).toBe(1);
  });

  // -------- 2: upsertLog presa with ISO datetime passthrough --------
  it('upsertLog presa: ISO datetime ora_effettiva passthrough (no double-coerce)', async () => {
    apiClient.post.mockResolvedValue({ id: 101 });
    await repo.upsertLog(42, '2026-05-24', 1, {
      stato: 'presa',
      ora_prevista: '08:00',
      ora_effettiva: '2026-05-24T08:35:00',
    });
    const body = apiClient.post.mock.calls[0][1];
    expect(body.ora_effettiva).toBe('2026-05-24T08:35:00');
  });

  // -------- 3: upsertLog saltata --------
  it('upsertLog saltata: POST /log/saltata with data+dose_numero+ora_prevista+note', async () => {
    apiClient.post.mockResolvedValue({ id: 102 });
    await repo.upsertLog(42, '2026-05-24', 2, {
      stato: 'saltata',
      ora_prevista: '20:00',
      note: 'dimenticato',
    });
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/saltata');
    expect(body).toEqual({
      data: '2026-05-24',
      dose_numero: 2,
      ora_prevista: '20:00',
      note: 'dimenticato',
    });
  });

  // -------- 4: upsertLog sospesa --------
  it('upsertLog sospesa: POST /log/sospesa with data+dose_numero+ora_prevista+note', async () => {
    apiClient.post.mockResolvedValue({ id: 103 });
    await repo.upsertLog(42, '2026-05-24', 1, {
      stato: 'sospesa',
      ora_prevista: '08:00',
    });
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/sospesa');
    expect(body.note).toBeNull();
  });

  // -------- 5: upsertLog prevista -> undo --------
  it('upsertLog prevista: POST /log/undo body only {data,dose_numero}, no note', async () => {
    apiClient.post.mockResolvedValue({ id: 104 });
    await repo.upsertLog(42, '2026-05-24', 1, { stato: 'prevista' });
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/undo');
    expect(body).toEqual({ data: '2026-05-24', dose_numero: 1 });
  });

  // -------- 6: upsertLog ricalcolata -> undo (sub-AMB A.1 par.22.90) --------
  it('upsertLog ricalcolata: POST /log/undo (dispatch alias for prevista, sub-A.1)', async () => {
    apiClient.post.mockResolvedValue({ id: 105 });
    await repo.upsertLog(42, '2026-05-24', 1, { stato: 'ricalcolata' });
    expect(apiClient.post.mock.calls[0][0]).toBe('/api/farmaci/42/log/undo');
  });

  // -------- 7: upsertLog recupero (no stato + recupero_minuti > 0) --------
  it('upsertLog recupero_minuti>0 no stato: POST /log/recupero', async () => {
    apiClient.post.mockResolvedValue({ id: 106 });
    await repo.upsertLog(42, '2026-05-24', 1, { recupero_minuti: 30 });
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/recupero');
    expect(body).toEqual({ data: '2026-05-24', dose_numero: 1, recupero_minuti: 30 });
  });

  // -------- 8: upsertLog empty patch -> GENERIC --------
  it('upsertLog empty patch: throws RepositoryError GENERIC (unrecognized shape)', async () => {
    let caught;
    try {
      await repo.upsertLog(42, '2026-05-24', 1, {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepositoryError);
    expect(caught.code).toBe('GENERIC');
    expect(caught.message).toContain('patch shape');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  // -------- 9: upsertLog unknown stato -> GENERIC --------
  it('upsertLog unknown stato: throws RepositoryError GENERIC', async () => {
    let caught;
    try {
      await repo.upsertLog(42, '2026-05-24', 1, { stato: 'unknown' });
    } catch (err) {
      caught = err;
    }
    expect(caught.code).toBe('GENERIC');
  });

  // -------- 10: upsertLogsBatch atomic [presa@D, ricalcolata@D+1] -> 1 POST --------
  it('upsertLogsBatch atomic [presa@D, ricalcolata@D+1] same farmaco: 1 POST with ricalcolo nested', async () => {
    apiClient.post.mockResolvedValue({ id: 200, stato: 'presa' });
    const logs = [
      {
        farmaco_id: 42,
        data: '2026-05-24',
        dose_numero: 1,
        stato: 'presa',
        ora_prevista: '08:00',
        ora_effettiva: '08:30',
        delta_minuti: 30,
      },
      {
        farmaco_id: 42,
        data: '2026-05-25',
        dose_numero: 1,
        stato: 'ricalcolata',
        ora_prevista: '08:00',
        ora_ricalcolata: '08:30',
        gap_minuti: 30,
      },
    ];
    const result = await repo.upsertLogsBatch(logs);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/api/farmaci/42/log/presa');
    expect(body.ricalcolo_dose_successiva).toEqual({
      dose_numero: 1,
      data: '2026-05-25',
      ora_prevista: '08:00',
      ora_ricalcolata: '08:30',
      gap_minuti: 30,
    });
    expect(result).toHaveLength(2);
  });

  // -------- 11: upsertLogsBatch [presa, ricalcolata] different farmaco -> NOT atomic --------
  it('upsertLogsBatch [presa, ricalcolata] different farmaco_id: sequential dispatch (not atomic)', async () => {
    apiClient.post.mockResolvedValue({ id: 300 });
    const logs = [
      {
        farmaco_id: 42,
        data: '2026-05-24',
        dose_numero: 1,
        stato: 'presa',
        ora_prevista: '08:00',
        ora_effettiva: '08:30',
      },
      {
        farmaco_id: 99,
        data: '2026-05-25',
        dose_numero: 1,
        stato: 'ricalcolata',
        ora_prevista: '08:00',
      },
    ];
    await repo.upsertLogsBatch(logs);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(apiClient.post.mock.calls[0][0]).toBe('/api/farmaci/42/log/presa');
    expect(apiClient.post.mock.calls[1][0]).toBe('/api/farmaci/99/log/undo');
  });

  // -------- 12: upsertLogsBatch empty -> [] no calls --------
  it('upsertLogsBatch empty: returns [] with zero apiClient calls', async () => {
    const result = await repo.upsertLogsBatch([]);
    expect(result).toEqual([]);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  // -------- 13: upsertLogsBatch single presa -> 1 sequential dispatch --------
  it('upsertLogsBatch single presa: 1 sequential dispatch call', async () => {
    apiClient.post.mockResolvedValue({ id: 400 });
    await repo.upsertLogsBatch([
      {
        farmaco_id: 42,
        data: '2026-05-24',
        dose_numero: 1,
        stato: 'presa',
        ora_prevista: '08:00',
        ora_effettiva: '08:30',
      },
    ]);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post.mock.calls[0][0]).toBe('/api/farmaci/42/log/presa');
  });

  // -------- 14: getLogByRange fan-out cross-farmaci --------
  it('getLogByRange: fan-out 1+N (getFarmaci + per-farmaco log) flatten merge', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
        { id: 2, attivo: true, demo: false, intervallo_ore: '6.0' },
      ])
      .mockResolvedValueOnce([{ id: 10, farmaco_id: 1, data: '2026-05-24' }])
      .mockResolvedValueOnce([{ id: 20, farmaco_id: 2, data: '2026-05-25' }]);
    const result = await repo.getLogByRange('2026-05-24', '2026-05-25');
    expect(apiClient.get).toHaveBeenCalledTimes(3);
    expect(result.length).toBe(2);
    expect(apiClient.get.mock.calls[1][0]).toBe(
      '/api/farmaci/1/log?data_from=2026-05-24&data_to=2026-05-25'
    );
  });

  // -------- 15: getLogByRange fail-fast --------
  it('getLogByRange: fail-fast on first reject (Promise.all)', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockRejectedValueOnce(
        new RepositoryError({ code: 'NOT_FOUND', message: 'log not found' })
      );
    let caught;
    try {
      await repo.getLogByRange('2026-05-24', '2026-05-25');
    } catch (err) {
      caught = err;
    }
    expect(caught.code).toBe('NOT_FOUND');
  });

  // -------- 16: getLogByData alias --------
  it('getLogByData(d): alias for getLogByRange(d, d) sub-AMB C par.22.90', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockResolvedValueOnce([{ id: 10 }]);
    await repo.getLogByData('2026-05-24');
    expect(apiClient.get.mock.calls[1][0]).toBe(
      '/api/farmaci/1/log?data_from=2026-05-24&data_to=2026-05-24'
    );
  });

  // -------- 17: getLogByFarmacoData direct --------
  it('getLogByFarmacoData(fid,d): direct GET (no fan-out) sub-AMB D par.22.90', async () => {
    apiClient.get.mockResolvedValue([{ id: 11 }]);
    const result = await repo.getLogByFarmacoData(42, '2026-05-24');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get.mock.calls[0][0]).toBe(
      '/api/farmaci/42/log?data_from=2026-05-24&data_to=2026-05-24'
    );
    expect(result).toEqual([{ id: 11 }]);
  });

  // -------- 18: getLogByDataStato filter + sort ora_effettiva ASC null-last --------
  it('getLogByDataStato: filter by stato + sort ora_effettiva ASC null-last (sub-AMB E par.22.90)', async () => {
    apiClient.get
      .mockResolvedValueOnce([
        { id: 1, attivo: true, demo: false, intervallo_ore: '8.0' },
      ])
      .mockResolvedValueOnce([
        { id: 10, stato: 'presa', ora_effettiva: '08:30' },
        { id: 11, stato: 'saltata', ora_effettiva: null },
        { id: 12, stato: 'presa', ora_effettiva: null },
        { id: 13, stato: 'presa', ora_effettiva: '07:00' },
      ]);
    const result = await repo.getLogByDataStato('2026-05-24', 'presa');
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(13);
    expect(result[1].id).toBe(10);
    expect(result[2].id).toBe(12);
  });
});
