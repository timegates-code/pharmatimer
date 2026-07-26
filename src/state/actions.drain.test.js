// @vitest-environment node
// ============================================================
// actions.drainOutbox() -- trigger-driven drain thunk (CS-4.26).
// SENTINEL_QOCT_DRAIN_SUITE
// ============================================================
//
// Q-QSEPT-3=A / Q-QSEPT-7=A. Copre le tre proprieta che rendono il
// drenaggio da trigger sicuro, e che nessun altro pin protegge:
//   - il THROTTLE strozza dentro la finestra e riapre oltre;
//   - `rebuildPlan` gira SOLO quando qualcosa e stato consegnato;
//   - il thunk NON SOLLEVA MAI, in nessun ramo.
//
// Il terzo punto e clinico e non stilistico: il thunk e atteso in coda a
// `init()`, dentro il suo `try`. Una sua eccezione dispatcherebbe
// INIT_ERROR sopra un INIT_SUCCESS gia emesso, trasformando un intoppo di
// consegna in un avvio rotto.
//
// Il tempo si governa con `vi.spyOn(Date, 'now')`, non con i fake timer:
// e lo intervento minimo che basta, non tocca alcun timer e si ripristina
// da solo. Ambiente `node`: il thunk non ha bisogno del DOM.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActions } from './actions.js';

const T0 = 1_700_000_000_000;

const STATO = {
  status: 'ready',
  profiloAttivo: {
    id: 1,
    nome_profilo: 'Test',
    ora_sveglia: '07:00',
    ora_colazione: '08:00',
    ora_pranzo: '13:00',
    ora_cena: '20:00',
    ora_sonno: '23:00',
    attivo: 1,
  },
  farmaci: [],
  orari: [],
  impostazioni: {},
  plan: [],
  lastBuiltForDay: null,
};

function makeRepo(overrides = {}) {
  return {
    drainOutbox: vi.fn().mockResolvedValue(0),
    getLogByRange: vi.fn().mockResolvedValue([]),
    getFarmaci: vi.fn().mockResolvedValue([]),
    getAllOrari: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function build(repo) {
  return createActions({
    dispatch: vi.fn(),
    getState: () => STATO,
    repo,
  });
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(T0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('actions.drainOutbox -- throttle', () => {
  it('la seconda passata DENTRO la finestra e strozzata', async () => {
    // SENTINEL_QOCT_PIN_THROTTLE_CHIUDE
    const repo = makeRepo();
    const actions = build(repo);

    await expect(actions.drainOutbox()).resolves.toBe(0);
    Date.now.mockReturnValue(T0 + 30_000);
    await expect(actions.drainOutbox()).resolves.toBe(0);

    expect(repo.drainOutbox).toHaveBeenCalledTimes(1);
  });

  it('OLTRE la finestra la passata riparte', async () => {
    // SENTINEL_QOCT_PIN_THROTTLE_APRE
    // Il verso opposto. Senza di esso il pin precedente sarebbe
    // soddisfatto anche da un throttle sempre chiuso, che non
    // consegnerebbe mai nulla: M2.
    const repo = makeRepo();
    const actions = build(repo);

    await actions.drainOutbox();
    Date.now.mockReturnValue(T0 + 61_000);
    await actions.drainOutbox();

    expect(repo.drainOutbox).toHaveBeenCalledTimes(2);
  });

  it('il throttle NON gata il write-path: quello passa dal guardiano', async () => {
    // SENTINEL_QOCT_PIN_WRITEPATH_LIBERO
    // Spec 14.2.5 prescrive drain IMMEDIATO su nuova scrittura. La
    // consegna del tocco non passa da questo thunk, quindi il throttle
    // non puo ritardarla: qui si pinna che il thunk non sia sulla rotta
    // di `upsertLogsBatch`.
    const repo = makeRepo();
    const actions = build(repo);
    expect(typeof actions.drainOutbox).toBe('function');
    expect(actions.upsertLogsBatch).toBeUndefined();
  });
});

describe('actions.drainOutbox -- riallineamento', () => {
  it('con ZERO consegnati NON riallinea', async () => {
    // SENTINEL_QOCT_PIN_NO_REBUILD
    const repo = makeRepo({ drainOutbox: vi.fn().mockResolvedValue(0) });
    const actions = build(repo);

    await actions.drainOutbox();

    expect(repo.getLogByRange).not.toHaveBeenCalled();
  });

  it('con almeno UNO consegnato riallinea via rebuildPlan', async () => {
    // SENTINEL_QOCT_PIN_REBUILD
    // Q-QSEPT-7=A: il drenaggio da trigger non ha `logs` in mano, quindi
    // il riallineamento passa dal piano. `getLogByRange` e la lettura che
    // `rebuildPlan` fa SEMPRE, ed e la testimonianza osservabile.
    const repo = makeRepo({ drainOutbox: vi.fn().mockResolvedValue(2) });
    const actions = build(repo);

    await expect(actions.drainOutbox()).resolves.toBe(2);

    expect(repo.getLogByRange).toHaveBeenCalled();
  });
});

describe('actions.drainOutbox -- non solleva mai', () => {
  it('un rigetto della consegna NON propaga', async () => {
    // SENTINEL_QOCT_PIN_NO_THROW_DRAIN
    const repo = makeRepo({
      drainOutbox: vi.fn().mockRejectedValue(new TypeError('boom')),
    });
    const actions = build(repo);

    await expect(actions.drainOutbox()).resolves.toBe(0);
  });

  it('un rigetto del riallineamento NON propaga', async () => {
    // SENTINEL_QOCT_PIN_NO_THROW_REBUILD
    // Il riallineamento e ADVISORY: il suo fallimento non puo far
    // fallire un tocco gia annotato (Q-QUATER-5=A).
    const repo = makeRepo({
      drainOutbox: vi.fn().mockResolvedValue(1),
      getLogByRange: vi.fn().mockRejectedValue(new TypeError('boom')),
    });
    const actions = build(repo);

    await expect(actions.drainOutbox()).resolves.toBe(1);
  });
});
