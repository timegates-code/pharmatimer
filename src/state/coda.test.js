// @vitest-environment node
// ============================================================
// raccogliCoda -- il raccoglitore del terzo atto (CS-5.5 parte 2).
// SENTINEL_QTIRANTE_SUITE_CODA
// ============================================================
//
// Q-TIRANTE-1=A e il cuore clinico di questa suite: un fallimento di
// lettura NON e uno zero. `outboxCounts` e async e il suo `_wrap`
// rilancia (LocalRepository :57-64), quindi il rifiuto e RAGGIUNGIBILE
// -- a differenza di `contaAvvisi`, che e sincrono e non solleva. Un
// degrado a {0,0} dipingerebbe un parcheggio VUOTO mentre elementi sono
// parcheggiati, e 14.5.1 fa di `Da controllare: N` il solo stato che
// chiede mani umane: M2.
//
// Percio ogni prova qui sotto misura la stessa cosa in due versi: che
// cosa e stato dispacciato, e che nulla sia stato sollevato. I due
// controlli positivi in testa esistono perche una suite in cui TUTTO
// tace non distingue un collettore prudente da un collettore morto.

import { describe, it, expect, vi } from 'vitest';
import { raccogliCoda } from './coda.js';

function banco(outboxCounts) {
  const visti = [];
  const repo = outboxCounts === undefined ? {} : { outboxCounts };
  return { visti, dispatch: (a) => visti.push(a), repo };
}

describe('raccogliCoda -- il valore buono arriva a destinazione', () => {
  it('dispaccia SET_CODA con lo specchio esatto della sorgente', async () => {
    const b = banco(vi.fn().mockResolvedValue({ pending: 3, parked: 2 }));
    await raccogliCoda(b);
    expect(b.visti).toEqual([
      { type: 'SET_CODA', payload: { pending: 3, parked: 2 } },
    ]);
  });

  it('coda vuota e un DATO e non una assenza di dato', async () => {
    // Controllo positivo che separa {0,0} misurato da {0,0} inventato:
    // se questa tacesse, il degrado silenzioso sarebbe indistinguibile
    // dalla lettura riuscita di una coda vuota.
    const b = banco(vi.fn().mockResolvedValue({ pending: 0, parked: 0 }));
    await raccogliCoda(b);
    expect(b.visti).toEqual([
      { type: 'SET_CODA', payload: { pending: 0, parked: 0 } },
    ]);
  });
});

describe('raccogliCoda -- un fallimento NON diventa uno zero (M2)', () => {
  it('un rifiuto del repository non dispaccia nulla', async () => {
    const b = banco(vi.fn().mockRejectedValue(new Error('DB_UNAVAILABLE')));
    await expect(raccogliCoda(b)).resolves.toBeUndefined();
    expect(b.visti).toEqual([]);
  });

  it('il metodo ASSENTE non dispaccia e non solleva', async () => {
    // Non e ipotetico in generale: e la forma con cui ogni suite del
    // livello stato costruisce il proprio repo finto, e sara la forma
    // reale il giorno in cui una classe non porti la superficie.
    const b = banco(undefined);
    await expect(raccogliCoda(b)).resolves.toBeUndefined();
    expect(b.visti).toEqual([]);
  });

  it('un throw SINCRONO non dispaccia e non solleva', async () => {
    const b = banco(() => {
      throw new TypeError('boom');
    });
    await expect(raccogliCoda(b)).resolves.toBeUndefined();
    expect(b.visti).toEqual([]);
  });

  it('un ritorno null non dispaccia', async () => {
    const b = banco(vi.fn().mockResolvedValue(null));
    await raccogliCoda(b);
    expect(b.visti).toEqual([]);
  });

  it('un ritorno non oggetto non dispaccia', async () => {
    const b = banco(vi.fn().mockResolvedValue(7));
    await raccogliCoda(b);
    expect(b.visti).toEqual([]);
  });

  it('campi mancanti non dispacciano', async () => {
    const b = banco(vi.fn().mockResolvedValue({}));
    await raccogliCoda(b);
    expect(b.visti).toEqual([]);
  });
});

describe('raccogliCoda -- cio che non e un intero non e uno stato di coda', () => {
  // Un NaN o una stringa che arrivassero all'indicatore verrebbero resi
  // COME un conteggio, mentendo con l'autorita di un numero. Si rifiutano
  // alla porta invece di convertirli.
  const casi = [
    ['NaN', { pending: NaN, parked: 0 }],
    ['stringa numerica', { pending: '3', parked: 0 }],
    ['non intero', { pending: 1.5, parked: 0 }],
    ['negativo', { pending: -1, parked: 0 }],
    ['parked non intero', { pending: 0, parked: null }],
  ];

  for (const [nome, valore] of casi) {
    it(nome + ' non dispaccia', async () => {
      const b = banco(vi.fn().mockResolvedValue(valore));
      await expect(raccogliCoda(b)).resolves.toBeUndefined();
      expect(b.visti).toEqual([]);
    });
  }
});
