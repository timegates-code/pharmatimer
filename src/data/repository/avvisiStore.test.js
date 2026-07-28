// CS-5.3-bis -- suite of the durable seat of the presa-in-conflitto notice.
//
// The load-bearing test is A5: `setItem` that silently DROPS the value must
// make `salvaAvviso` return false. Without it the suite would be green on a
// store that only checks "setItem did not throw", and that store would
// authorise a drop against a notice that is not there -- M2.
//
// SENTINEL_QLETTO_AVVISI_SUITE

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  salvaAvviso,
  elencaAvvisi,
  rimuoviAvviso,
  avvisoKey,
  MOTIVI_AVVISO,
} from './avvisiStore.js';

// Storage stub with the real Storage surface (length/key), so the module is
// exercised through the same API a browser exposes.
function creaStub(opts = {}) {
  const mappa = new Map();
  return {
    _mappa: mappa,
    get length() {
      return mappa.size;
    },
    key(i) {
      return Array.from(mappa.keys())[i] ?? null;
    },
    getItem(k) {
      if (opts.getThrows) throw new Error('get boom');
      return mappa.has(k) ? mappa.get(k) : null;
    },
    setItem(k, v) {
      if (opts.setThrows) throw new Error('quota');
      if (opts.setSilentlyDrops) return; // scrive nulla, non lancia
      mappa.set(k, String(v));
    },
    removeItem(k) {
      if (opts.removeThrows) throw new Error('boom');
      if (opts.removeSilentlyIgnores) return; // non lancia e non rimuove
      mappa.delete(k);
    },
  };
}

const FATTI = Object.freeze({
  client_op_id: 'aaaa-1111',
  farmaco_nome: 'Cardioaspirina',
  dose_numero: 2,
  data: '2026-07-24',
  ora_tocco: '2026-07-24T13:05:00.000Z',
  op: 'presa',
  motivo: MOTIVI_AVVISO.CONFLITTO,
});

const ORA = () => '2026-07-24T13:05:30.000Z';

let originale;

beforeEach(() => {
  originale = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
});

afterEach(() => {
  if (originale) {
    Object.defineProperty(globalThis, 'localStorage', originale);
  } else {
    delete globalThis.localStorage;
  }
});

function montaStub(opts) {
  const stub = creaStub(opts);
  Object.defineProperty(globalThis, 'localStorage', {
    value: stub,
    configurable: true,
    writable: true,
  });
  return stub;
}

describe('avvisiStore -- scrittura (Q-LETTO-1=A, Q-LETTO-4=A)', () => {
  it('A1 salva e ritorna true; la chiave e una per targa', () => {
    const ls = montaStub();
    expect(salvaAvviso(FATTI, ORA)).toBe(true);
    expect(ls.length).toBe(1);
    expect(ls.key(0)).toBe('pharmatimer.avviso.aaaa-1111');
    expect(avvisoKey('aaaa-1111')).toBe('pharmatimer.avviso.aaaa-1111');
  });

  it('A2 congela i fatti piu creato_at dallo orologio iniettato', () => {
    const ls = montaStub();
    salvaAvviso(FATTI, ORA);
    const r = JSON.parse(ls.getItem(avvisoKey('aaaa-1111')));
    expect(r).toEqual({ ...FATTI, creato_at: '2026-07-24T13:05:30.000Z' });
  });

  it('A3 IDEMPOTENTE per targa: due volte, una sola chiave', () => {
    const ls = montaStub();
    expect(salvaAvviso(FATTI, ORA)).toBe(true);
    expect(salvaAvviso(FATTI, () => '2026-07-24T14:00:00.000Z')).toBe(true);
    expect(ls.length).toBe(1);
  });

  it('A4 setItem che LANCIA: false, e il chiamante non deve droppare', () => {
    montaStub({ setThrows: true });
    expect(salvaAvviso(FATTI, ORA)).toBe(false);
  });

  it('A5 setItem che SCARTA IN SILENZIO: false per RILETTURA, non per assenza di eccezione', () => {
    const ls = montaStub({ setSilentlyDrops: true });
    expect(salvaAvviso(FATTI, ORA)).toBe(false);
    expect(ls.length).toBe(0);
  });

  it('A6 localStorage assente: false, mai una eccezione', () => {
    delete globalThis.localStorage;
    expect(salvaAvviso(FATTI, ORA)).toBe(false);
  });

  it.each([
    ['client_op_id', undefined],
    ['client_op_id', '  '],
    ['farmaco_nome', undefined],
    ['farmaco_nome', ''],
    ['dose_numero', undefined],
    ['dose_numero', 0],
    ['dose_numero', '2'],
    ['data', undefined],
    ['ora_tocco', undefined],
    ['op', undefined],
    ['motivo', undefined],
  ])('A7 campo %s = %p: false e NIENTE scritto', (campo, valore) => {
    const ls = montaStub();
    expect(salvaAvviso({ ...FATTI, [campo]: valore }, ORA)).toBe(false);
    expect(ls.length).toBe(0);
  });

  it('A8 CONTROLLO POSITIVO -- coi fatti completi salva davvero', () => {
    const ls = montaStub();
    expect(salvaAvviso(FATTI, ORA)).toBe(true);
    expect(ls.length).toBe(1);
  });
});

describe('avvisiStore -- lettura', () => {
  it('A9 elenca in ordine di creato_at, dal piu vecchio', () => {
    montaStub();
    salvaAvviso({ ...FATTI, client_op_id: 'b' }, () => '2026-07-24T15:00:00.000Z');
    salvaAvviso({ ...FATTI, client_op_id: 'a' }, () => '2026-07-24T09:00:00.000Z');
    expect(elencaAvvisi().map((r) => r.client_op_id)).toEqual(['a', 'b']);
  });

  it('A10 una voce CORROTTA ne perde UNA sola, non tutte', () => {
    const ls = montaStub();
    salvaAvviso({ ...FATTI, client_op_id: 'buona' }, ORA);
    ls.setItem('pharmatimer.avviso.rotta', '{ non json');
    const elenco = elencaAvvisi();
    expect(elenco).toHaveLength(1);
    expect(elenco[0].client_op_id).toBe('buona');
  });

  it('A11 ignora le chiavi altrui gia in uso', () => {
    const ls = montaStub();
    ls.setItem('pharmatimer.userToken', 'tok');
    ls.setItem('pharmatimer.onboardingCompleted', '1');
    ls.setItem('pharmatimer.mirrorFreshness', '2026-07-24T00:00:00Z');
    ls.setItem('pharmatimer.useApiRepo', '1');
    // INTRUSO di forma VALIDA: senza di lui il test resta verde anche se il
    // filtro di prefisso sparisce, perche le altre chiavi altrui cadono gia
    // sui controlli di forma. Un esito compatibile con entrambe le ipotesi
    // non e una misura (LC-106).
    ls.setItem('pharmatimer.altroModulo', JSON.stringify({ client_op_id: 'intruso' }));
    salvaAvviso(FATTI, ORA);
    expect(elencaAvvisi().map((r) => r.client_op_id)).toEqual(['aaaa-1111']);
  });

  it('A12 localStorage assente o getItem che lancia: elenco vuoto', () => {
    delete globalThis.localStorage;
    expect(elencaAvvisi()).toEqual([]);
    montaStub({ getThrows: true });
    expect(elencaAvvisi()).toEqual([]);
  });
});

describe('avvisiStore -- rimozione, la SOLA via di sparizione', () => {
  it('A13 rimuove su Ho letto e ritorna true', () => {
    const ls = montaStub();
    salvaAvviso(FATTI, ORA);
    expect(rimuoviAvviso('aaaa-1111')).toBe(true);
    expect(ls.length).toBe(0);
    expect(elencaAvvisi()).toEqual([]);
  });

  it('A14 removeItem che lancia: false, e lo avviso resta leggibile', () => {
    montaStub({ removeThrows: true });
    salvaAvviso(FATTI, ORA);
    expect(rimuoviAvviso('aaaa-1111')).toBe(false);
    expect(elencaAvvisi()).toHaveLength(1);
  });

  it('A19 removeItem che IGNORA in silenzio: false per RILETTURA', () => {
    // Analogo di A5 sul verso opposto. A14 esce al catch e non raggiunge mai
    // la rilettura, quindi senza questo test quella riga non e presidiata.
    montaStub({ removeSilentlyIgnores: true });
    salvaAvviso(FATTI, ORA);
    expect(rimuoviAvviso('aaaa-1111')).toBe(false);
    expect(elencaAvvisi()).toHaveLength(1);
  });

  it('A15 id non stringa o vuoto: false, e non tocca nulla', () => {
    montaStub();
    salvaAvviso(FATTI, ORA);
    expect(rimuoviAvviso('')).toBe(false);
    expect(rimuoviAvviso(null)).toBe(false);
    expect(rimuoviAvviso(42)).toBe(false);
    expect(elencaAvvisi()).toHaveLength(1);
  });

  it('A16 NESSUNA scadenza e NESSUN tetto: due avvisi restano due', () => {
    montaStub();
    salvaAvviso({ ...FATTI, client_op_id: 'x' }, () => '2020-01-01T00:00:00.000Z');
    salvaAvviso({ ...FATTI, client_op_id: 'y' }, ORA);
    expect(elencaAvvisi()).toHaveLength(2);
  });
});

describe('avvisiStore -- vocabolario append-only', () => {
  it('A17 MOTIVI_AVVISO e congelato e porta CONFLITTO', () => {
    expect(Object.values(MOTIVI_AVVISO)).toContain('CONFLITTO');
    expect(Object.isFrozen(MOTIVI_AVVISO)).toBe(true);
  });

  it('A18 il motivo NON riusa il vocabolario di parcheggio', () => {
    // Un elemento droppato non e un elemento parcheggiato: una etichetta di
    // parcheggio su un gesto droppato sarebbe una spiegazione falsa.
    expect(Object.values(MOTIVI_AVVISO)).not.toContain('CONFLITTO_VERO');
  });
});
