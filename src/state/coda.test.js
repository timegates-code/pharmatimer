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
import { raccogliCoda, raccogliSenzaCollegamento } from './coda.js';

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

// ============================================================
// SENTINEL_QLESENA_SUITE_GEMELLO
// raccogliSenzaCollegamento -- il gemello del terzo stato (CS-5.6-bis P2).
// ------------------------------------------------------------
// BANCO PROPRIO E NON ESTESO. `banco()` qui sopra costruisce un repo che
// NON porta `isUnreachable`, ed e quella la forma che pinna la porta 1:
// estenderlo avrebbe tolto il caso di ASSENZA alle tredici prove che oggi
// lo esercitano senza saperlo.
// ============================================================

function bancoLatch(isUnreachable) {
  const visti = [];
  const repo = isUnreachable === undefined ? {} : { isUnreachable };
  return { visti, dispatch: (a) => visti.push(a), repo };
}

describe('raccogliSenzaCollegamento -- porta 1, la ASSENZA tace', () => {
  it('L1 metodo assente: non dispaccia e non solleva', () => {
    // Q-LESENA-2=A. getRepository() consegna un LocalRepository nudo a
    // flag API spento e quella classe non porta il metodo. La assenza non
    // nasconde nulla: senza server non ce alcun senza-collegamento da
    // riferire, ed e per questo che lo argomento M2 di Q-RINTOCCO-2=A
    // non si applica qui.
    const b = bancoLatch(undefined);
    expect(() => raccogliSenzaCollegamento(b)).not.toThrow();
    expect(b.visti).toEqual([]);
  });

  it('L2 repo assente: non solleva, che e il contratto NEVER THROWS', () => {
    expect(() =>
      raccogliSenzaCollegamento({ dispatch: () => {}, repo: undefined }),
    ).not.toThrow();
  });

  it('L3 CONTROLLO POSITIVO: col metodo presente il banco VEDE il dispatch', () => {
    // Senza questo, L1 e L2 sarebbero verdi anche con un gemello MORTO:
    // intercetterebbero senza isolare.
    const b = bancoLatch(() => true);
    raccogliSenzaCollegamento(b);
    expect(b.visti).toEqual([
      { type: 'SET_SENZA_COLLEGAMENTO', payload: true },
    ]);
  });
});

describe('raccogliSenzaCollegamento -- lo specchio e ESATTO sulla terna', () => {
  it.each([[true], [false], [null]])('L4 dispaccia %s tale e quale', (v) => {
    const b = bancoLatch(() => v);
    raccogliSenzaCollegamento(b);
    expect(b.visti).toEqual([
      { type: 'SET_SENZA_COLLEGAMENTO', payload: v },
    ]);
  });

  it('L5 null si dispaccia e NON si salta: saltarlo sarebbe una traduzione', () => {
    const b = bancoLatch(() => null);
    raccogliSenzaCollegamento(b);
    expect(b.visti).toHaveLength(1);
    expect(b.visti[0].payload).toBeNull();
  });
});

describe('raccogliSenzaCollegamento -- porta 2 e porta 3', () => {
  it('L6 un throw del guardiano non dispaccia e non propaga', () => {
    // Il metodo e documentato incapace di sollevare, ma poggiare su una
    // proprieta del CHIAMATO e cio che Q-OBLO-2=A ha gia rifiutato.
    const b = bancoLatch(() => {
      throw new TypeError('boom');
    });
    expect(() => raccogliSenzaCollegamento(b)).not.toThrow();
    expect(b.visti).toEqual([]);
  });

  const fuoriTerna = [
    ['stringa vera', 'true'],
    ['numero', 1],
    ['zero', 0],
    ['oggetto', {}],
    ['undefined', undefined],
  ];

  for (const [nome, v] of fuoriTerna) {
    it('L7 fuori terna non dispaccia: ' + nome, () => {
      // M3. La copy legge con `=== true`, quindi un valore fuori terna
      // cadrebbe sul ramo `false` e la superficie affermerebbe un
      // collegamento MAI MISURATO. Si rifiuta alla porta, stessa clausola
      // gia applicata ai conteggi.
      const b = bancoLatch(() => v);
      raccogliSenzaCollegamento(b);
      expect(b.visti).toEqual([]);
    });
  }
});

describe('raccogliSenzaCollegamento -- IN TESTA dentro raccogliCoda', () => {
  it('L8 PIN PORTANTE: una lettura di coda FALLITA non acceca il latch', async () => {
    // Q-OGIVA-5=A, ed e la ragione per cui il gemello sta IN TESTA:
    // raccogliCoda ha QUATTRO ritorni anticipati, e un fatto indipendente
    // non deve morire col fallimento di un altro.
    const visti = [];
    const repo = {
      outboxCounts: vi.fn().mockRejectedValue(new Error('DB_UNAVAILABLE')),
      isUnreachable: () => true,
    };
    await raccogliCoda({ dispatch: (a) => visti.push(a), repo });
    expect(visti).toEqual([
      { type: 'SET_SENZA_COLLEGAMENTO', payload: true },
    ]);
  });

  it('L9 col buono arrivano ENTRAMBI, e il latch per PRIMO', async () => {
    const visti = [];
    const repo = {
      outboxCounts: vi.fn().mockResolvedValue({ pending: 1, parked: 0 }),
      isUnreachable: () => false,
    };
    await raccogliCoda({ dispatch: (a) => visti.push(a), repo });
    expect(visti.map((a) => a.type)).toEqual([
      'SET_SENZA_COLLEGAMENTO',
      'SET_CODA',
    ]);
  });
});

