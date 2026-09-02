// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { defaultNewId } from './outboxSplitter.js';

// La targa (client_op_id) e cio che rende una presa idempotente sul server.
// Questi test coprono il RAMO DI RIPIEGO: crypto.randomUUID e gated su
// SecureContext e non esiste quando la PWA e servita in http sulla LAN, che
// e come la serve il Mini. In quel regime la targa deve nascere lo stesso,
// e deve nascere FORTE.

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// globalThis.crypto in Node e un accessor di sola lettura: si sostituisce
// con vi.stubGlobal, non per assegnazione. Misurato: assegnare da
// "TypeError: Cannot set property crypto of #<Object> which has only a getter".
const vero = globalThis.crypto;

/** Sostituisce crypto con uno che NON ha randomUUID: forza il ripiego. */
function senzaRandomUUID() {
  vi.stubGlobal('crypto', { getRandomValues: (a) => vero.getRandomValues(a) });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('defaultNewId -- ramo nominale', () => {
  it('usa crypto.randomUUID quando esiste e rende un UUID v4', () => {
    expect(defaultNewId()).toMatch(V4);
  });
});

describe('defaultNewId -- ramo di ripiego (senza randomUUID)', () => {
  it('il ramo e davvero esercitato: randomUUID non esiste piu', () => {
    senzaRandomUUID();
    expect(globalThis.crypto.randomUUID).toBeUndefined();
    expect(typeof globalThis.crypto.getRandomValues).toBe('function');
  });

  it('rende una targa in forma UUID v4, versione e variante comprese', () => {
    senzaRandomUUID();
    for (let i = 0; i < 100; i += 1) {
      expect(defaultNewId()).toMatch(V4);
    }
  });

  it('e unica su un campione grande', () => {
    senzaRandomUUID();
    const N = 20000;
    const viste = new Set();
    for (let i = 0; i < N; i += 1) viste.add(defaultNewId());
    expect(viste.size).toBe(N);
  });

  it('non ripiega su Math.random: con getRandomValues a zero la forma resta valida e il contenuto e quello dato', () => {
    // Sonda che DISTINGUE: se la sede usasse Math.random, azzerare
    // getRandomValues non cambierebbe lo esito. Qui invece la targa e
    // interamente determinata dai byte forniti, versione e variante a parte.
    vi.stubGlobal('crypto', { getRandomValues: (a) => a.fill(0) });
    expect(defaultNewId()).toBe('00000000-0000-4000-8000-000000000000');
    vi.stubGlobal('crypto', { getRandomValues: (a) => a.fill(0xff) });
    expect(defaultNewId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});

describe('defaultNewId -- nessuna sorgente forte', () => {
  it('solleva invece di inventare una targa debole', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => defaultNewId()).toThrow(/targa non generabile/);
  });

  it('solleva anche se crypto esiste ma e vuoto', () => {
    vi.stubGlobal('crypto', {});
    expect(() => defaultNewId()).toThrow(/targa non generabile/);
  });
});
