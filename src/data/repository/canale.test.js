// @vitest-environment node
//
// The network module of the reminder channel (decision 14 A): the five calls
// of /api/push through apiClient, and this phone's device_id.
//
// The load-bearing test of the id is the storage that silently DROPS the
// value: an id generated anew at every opening would leave the phone's older
// subscriptions active next to the new one, so no id is better than one that
// does not stay written.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from './apiClient.js';
import {
  deviceId,
  leggiDeviceId,
  leggiChiave,
  confermaIscrizione,
  revocaIscrizione,
  pubblicaCalendario,
  leggiStato,
} from './canale.js';

const CHIAVE_ID = 'pharmatimer.canale.deviceId';
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function creaStub(opts = {}) {
  const mappa = new Map();
  return {
    _mappa: mappa,
    getItem(k) {
      if (opts.getThrows) throw new Error('get boom');
      return mappa.has(k) ? mappa.get(k) : null;
    },
    setItem(k, v) {
      if (opts.setThrows) throw new Error('quota');
      if (opts.setSilentlyDrops) return;
      mappa.set(k, String(v));
    },
    removeItem(k) {
      mappa.delete(k);
    },
  };
}

let originale;

function montaStub(opts) {
  const stub = creaStub(opts);
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  return stub;
}

beforeEach(() => {
  originale = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  vi.clearAllMocks();
});

afterEach(() => {
  if (originale) {
    Object.defineProperty(globalThis, 'localStorage', originale);
  } else {
    delete globalThis.localStorage;
  }
});

describe('device_id', () => {
  it('generato una volta e poi sempre lo stesso', () => {
    const stub = montaStub();
    const primo = deviceId();
    expect(primo).toMatch(FORMA_UUID);
    expect(stub._mappa.get(CHIAVE_ID)).toBe(primo);
    expect(deviceId()).toBe(primo);
  });

  it('un valore malformato si sostituisce', () => {
    const stub = montaStub();
    stub._mappa.set(CHIAVE_ID, 'non-un-uuid');
    const id = deviceId();
    expect(id).toMatch(FORMA_UUID);
    expect(stub._mappa.get(CHIAVE_ID)).toBe(id);
  });

  it('uno storage che non tiene la scrittura non da alcun id', () => {
    montaStub({ setSilentlyDrops: true });
    expect(deviceId()).toBeNull();
  });

  it('uno storage che lancia non da alcun id', () => {
    montaStub({ getThrows: true, setThrows: true });
    expect(deviceId()).toBeNull();
  });

  it('la lettura non crea mai un id', () => {
    const stub = montaStub();
    expect(leggiDeviceId()).toBeNull();
    expect(stub._mappa.has(CHIAVE_ID)).toBe(false);
  });
});

describe('le chiamate di /api/push', () => {
  it('chiave: GET /api/push/chiave, ne restituisce la chiave pubblica', async () => {
    apiClient.get.mockResolvedValue({ chiave_pubblica: 'BCHIAVE' });
    await expect(leggiChiave()).resolves.toBe('BCHIAVE');
    expect(apiClient.get).toHaveBeenCalledWith('/api/push/chiave');
  });

  it('chiave assente: il rifiuto del client arriva al chiamante', async () => {
    apiClient.get.mockRejectedValue(Object.assign(new Error('Canale spento'), { code: 'DB_UNAVAILABLE' }));
    await expect(leggiChiave()).rejects.toThrow('Canale spento');
  });

  it('iscrizione: PUT con endpoint, chiavi e device_id, e nient altro', async () => {
    apiClient.put.mockResolvedValue({ attiva: true });
    const id = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
    await confermaIscrizione({
      endpoint: 'https://web.push.apple.com/x',
      expirationTime: null,
      keys: { p256dh: 'P', auth: 'A' },
      device_id: id,
    });
    expect(apiClient.put).toHaveBeenCalledWith('/api/push/iscrizione', {
      endpoint: 'https://web.push.apple.com/x',
      keys: { p256dh: 'P', auth: 'A' },
      device_id: id,
    });
  });

  it('revoca: DELETE col device_id nel path', async () => {
    apiClient.delete.mockResolvedValue(null);
    const id = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
    await revocaIscrizione(id);
    expect(apiClient.delete).toHaveBeenCalledWith(`/api/push/iscrizione/${id}`);
  });

  it('revoca con un id non valido: nessuna chiamata', async () => {
    await expect(revocaIscrizione('../utenti/1')).rejects.toThrow('device_id non valido');
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('calendario: PUT /api/push/calendario col corpo dato', async () => {
    apiClient.put.mockResolvedValue({ voci: 0 });
    const corpo = { device_id: 'x', voci: [] };
    await pubblicaCalendario(corpo);
    expect(apiClient.put).toHaveBeenCalledWith('/api/push/calendario', corpo);
  });

  it('stato: GET /api/push/stato', async () => {
    apiClient.get.mockResolvedValue({ ora_server_ms: 1 });
    await expect(leggiStato()).resolves.toEqual({ ora_server_ms: 1 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/push/stato');
  });
});
