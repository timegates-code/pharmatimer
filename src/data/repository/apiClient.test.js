// src/data/repository/apiClient.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 13 unit tests for apiClient HTTP wrapper.
// Covers: token injection, HTTP method helpers, 3 body shape error normalization
// (vocabulary / 401 detail / 422 Pydantic array), severity overrides for 5xx.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './apiClient.js';
import { RepositoryError } from './RepositoryError.js';

describe('apiClient HTTP wrapper (F3-S5-alpha N+5.I)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
    localStorage.setItem('pharmatimer.userToken', 'test-token-abc');
  });

  // -------- 1: GET 200 with X-User-Token header --------
  it('get(): GET 200 returns parsed body and injects X-User-Token header', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify([{ id: 1, nome: 'X' }]),
    });
    const data = await apiClient.get('/api/farmaci');
    expect(data).toEqual([{ id: 1, nome: 'X' }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/farmaci');
    expect(opts.method).toBe('GET');
    expect(opts.headers['X-User-Token']).toBe('test-token-abc');
    expect(opts.body).toBeUndefined();
  });

  // -------- 2: POST 201 with JSON body --------
  it('post(): POST 201 returns parsed body and sends JSON body + Content-Type', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 201,
      text: async () => JSON.stringify({ id: 42 }),
    });
    const data = await apiClient.post('/api/farmaci', { nome: 'Aspirina' });
    expect(data).toEqual({ id: 42 });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ nome: 'Aspirina' });
  });

  // -------- 3: PUT 200 --------
  it('put(): PUT 200 returns parsed body', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const data = await apiClient.put('/api/farmaci/1', { nome: 'Y' });
    expect(data).toEqual({ ok: true });
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT');
  });

  // -------- 4: DELETE 204 returns null --------
  it('delete(): DELETE 204 returns null (no body parse)', async () => {
    global.fetch.mockResolvedValueOnce({ status: 204, text: async () => '' });
    const data = await apiClient.delete('/api/farmaci/1');
    expect(data).toBeNull();
    expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  // -------- 5: token absent -> immediate UNAUTHORIZED, no fetch --------
  it('token absent: throws RepositoryError UNAUTHORIZED severity=error pre-fetch', async () => {
    localStorage.removeItem('pharmatimer.userToken');
    await expect(apiClient.get('/api/farmaci')).rejects.toThrow(RepositoryError);
    try {
      await apiClient.get('/api/farmaci');
    } catch (err) {
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.severity).toBe('error');
      expect(err.message).toContain('Token utente assente');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // -------- 6: HTTP 401 detail string -> UNAUTHORIZED severity='error' --------
  it('HTTP 401 detail string: maps to UNAUTHORIZED severity=error (drift-doc-N54 Opzione A)', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 401,
      text: async () => JSON.stringify({ detail: 'Token scaduto' }),
    });
    await expect(apiClient.get('/api/farmaci')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      severity: 'error',
      message: 'Token scaduto',
    });
  });

  // -------- 7: HTTP 403 vocabulary -> FORBIDDEN severity from body --------
  it('HTTP 403 vocabulary body: maps to FORBIDDEN with severity from body', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 403,
      text: async () =>
        JSON.stringify({
          error: { code: 'FORBIDDEN', severity: 'warning', message: 'Admin only' },
        }),
    });
    await expect(apiClient.get('/api/permessi')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      severity: 'warning',
      message: 'Admin only',
    });
  });

  // -------- 8: HTTP 404 vocabulary -> NOT_FOUND --------
  it('HTTP 404 vocabulary body: maps to NOT_FOUND severity=warning (default)', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 404,
      text: async () =>
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Farmaco 99 non trovato' } }),
    });
    try {
      await apiClient.get('/api/farmaci/99');
    } catch (err) {
      expect(err.code).toBe('NOT_FOUND');
      expect(err.severity).toBe('warning');
      expect(err.message).toBe('Farmaco 99 non trovato');
    }
  });

  // -------- 9: HTTP 409 vocabulary -> CONSTRAINT_VIOLATION --------
  it('HTTP 409 vocabulary body: maps to CONSTRAINT_VIOLATION severity=error', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 409,
      text: async () =>
        JSON.stringify({
          error: { code: 'CONSTRAINT_VIOLATION', severity: 'error', message: 'duplicato' },
        }),
    });
    await expect(apiClient.post('/api/farmaci', {})).rejects.toMatchObject({
      code: 'CONSTRAINT_VIOLATION',
      severity: 'error',
    });
  });

  // -------- 10: HTTP 422 Pydantic array detail --------
  it('HTTP 422 Pydantic detail array: maps to CONSTRAINT_VIOLATION with loc.msg format', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 422,
      text: async () =>
        JSON.stringify({
          detail: [
            { loc: ['body', 'nome'], msg: 'field required', type: 'value_error.missing' },
          ],
        }),
    });
    try {
      await apiClient.post('/api/farmaci', {});
    } catch (err) {
      expect(err.code).toBe('CONSTRAINT_VIOLATION');
      expect(err.message).toBe('body.nome: field required');
    }
  });

  // -------- 11: HTTP 503 -> DB_UNAVAILABLE critical override --------
  it('HTTP 503: maps to DB_UNAVAILABLE severity=critical (override regardless body)', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 503,
      text: async () =>
        JSON.stringify({ error: { code: 'DB_UNAVAILABLE', message: 'Service unavailable' } }),
    });
    try {
      await apiClient.get('/api/farmaci');
    } catch (err) {
      expect(err.code).toBe('DB_UNAVAILABLE');
      expect(err.severity).toBe('critical');
    }
  });

  // -------- 12: HTTP 500 -> DB_UNAVAILABLE critical --------
  it('HTTP 500: maps to DB_UNAVAILABLE severity=critical (5xx universal)', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 500,
      text: async () => JSON.stringify({}),
    });
    try {
      await apiClient.get('/api/farmaci');
    } catch (err) {
      expect(err.code).toBe('DB_UNAVAILABLE');
      expect(err.severity).toBe('critical');
    }
  });

  // -------- 13: network error -> DB_UNAVAILABLE critical --------
  it('network error (fetch rejects): maps to DB_UNAVAILABLE severity=critical with cause', async () => {
    const netErr = new TypeError('fetch failed');
    global.fetch.mockRejectedValueOnce(netErr);
    try {
      await apiClient.get('/api/farmaci');
    } catch (err) {
      expect(err.code).toBe('DB_UNAVAILABLE');
      expect(err.severity).toBe('critical');
      expect(err.cause).toBe(netErr);
    }
  });
});

// Note: _internals export is covered indirectly by tests 5/6/7 (UNAUTHORIZED+
// FORBIDDEN+HTTP_STATUS_TO_CODE behavior).
