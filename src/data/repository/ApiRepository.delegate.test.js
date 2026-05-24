// src/data/repository/ApiRepository.delegate.test.js
//
// SENTINEL_N5I_CP1_POST_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// CP1.B (par.11.N-S3 N+5.I): 11 tests for composition delegate pattern.
// ApiRepository owns private LocalRepository instance (Lesson #28 candidate par.22.90).
// 10 delegate methods (7 Profili + 3 Setting) + 1 inherently-local (setProfiloAttivoConCleanup)
// MUST call this._local.<method> with identical arguments and return its value.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiRepository } from './ApiRepository.js';
import { LocalRepository } from './LocalRepository.js';

describe('ApiRepository delegate composition (Lesson #28 par.22.90)', () => {
  let repo;
  let local;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('pharmatimer.userToken', 'test-token');
    repo = new ApiRepository();
    local = repo._local;
  });

  // -------- 1: getProfili delegate --------
  it('getProfili delegates to _local with no args and returns its value', async () => {
    const spy = vi.spyOn(local, 'getProfili').mockResolvedValue([{ id: 1 }]);
    const result = await repo.getProfili();
    expect(spy).toHaveBeenCalledWith();
    expect(result).toEqual([{ id: 1 }]);
  });

  // -------- 2: getProfiloAttivo delegate --------
  it('getProfiloAttivo delegates to _local with no args', async () => {
    const spy = vi.spyOn(local, 'getProfiloAttivo').mockResolvedValue({ id: 2 });
    const result = await repo.getProfiloAttivo();
    expect(spy).toHaveBeenCalledWith();
    expect(result).toEqual({ id: 2 });
  });

  // -------- 3: addProfilo delegate --------
  it('addProfilo delegates to _local with profile arg passthrough', async () => {
    const profilo = { nome: 'P1' };
    const spy = vi.spyOn(local, 'addProfilo').mockResolvedValue(42);
    const result = await repo.addProfilo(profilo);
    expect(spy).toHaveBeenCalledWith(profilo);
    expect(result).toBe(42);
  });

  // -------- 4: updateProfilo delegate --------
  it('updateProfilo delegates to _local with id+patch args', async () => {
    const patch = { nome: 'P2' };
    const spy = vi.spyOn(local, 'updateProfilo').mockResolvedValue(undefined);
    await repo.updateProfilo(7, patch);
    expect(spy).toHaveBeenCalledWith(7, patch);
  });

  // -------- 5: deleteProfilo delegate --------
  it('deleteProfilo delegates to _local with id arg', async () => {
    const spy = vi.spyOn(local, 'deleteProfilo').mockResolvedValue(undefined);
    await repo.deleteProfilo(5);
    expect(spy).toHaveBeenCalledWith(5);
  });

  // -------- 6: setProfiloAttivo delegate --------
  it('setProfiloAttivo delegates to _local with id arg', async () => {
    const spy = vi.spyOn(local, 'setProfiloAttivo').mockResolvedValue(undefined);
    await repo.setProfiloAttivo(3);
    expect(spy).toHaveBeenCalledWith(3);
  });

  // -------- 7: setProfiloAttivoConCleanup inherently-local --------
  it('setProfiloAttivoConCleanup delegates (inherently-local, EMP-15 par.22.90)', async () => {
    const logsToDelete = [{ id: 100 }, { id: 101 }];
    const spy = vi
      .spyOn(local, 'setProfiloAttivoConCleanup')
      .mockResolvedValue(undefined);
    await repo.setProfiloAttivoConCleanup(9, logsToDelete);
    expect(spy).toHaveBeenCalledWith(9, logsToDelete);
  });

  // -------- 8: getSetting delegate --------
  it('getSetting delegates to _local with key arg', async () => {
    const spy = vi.spyOn(local, 'getSetting').mockResolvedValue('value');
    const result = await repo.getSetting('theme');
    expect(spy).toHaveBeenCalledWith('theme');
    expect(result).toBe('value');
  });

  // -------- 9: setSetting delegate --------
  it('setSetting delegates to _local with key+value args', async () => {
    const spy = vi.spyOn(local, 'setSetting').mockResolvedValue(undefined);
    await repo.setSetting('theme', 'dark');
    expect(spy).toHaveBeenCalledWith('theme', 'dark');
  });

  // -------- 10: getAllSettings delegate --------
  it('getAllSettings delegates to _local with no args', async () => {
    const spy = vi.spyOn(local, 'getAllSettings').mockResolvedValue({ a: 1 });
    const result = await repo.getAllSettings();
    expect(spy).toHaveBeenCalledWith();
    expect(result).toEqual({ a: 1 });
  });

  // -------- 11: composition injectable _local --------
  it('constructor accepts injected _local instance (composition over inheritance)', () => {
    const custom = new LocalRepository();
    const repoCustom = new ApiRepository(custom);
    expect(repoCustom._local).toBe(custom);
  });
});
