// @vitest-environment node
// ============================================================
// commitApplyResult -- pin della GUARDIA DI LIVELLO 1 (s.6.261).
// par.22.198-novemtriginties. SENTINEL_S6261_PIN_L1_GUARD
// ------------------------------------------------------------
// Qui `applyHelper` NON e mockato: si esercita la guardia vera.
// Il file gemello actions.op.test.js mocka lo helper e pinna la
// cucitura dei sette thunk; le due materie stanno separate perche
// un lettore futuro deve poter dire, a colpo di occhio, quale
// `commitApplyResult` sia sotto test.
//
// I due pin che contano sono il secondo e il terzo, e sono
// SIMMETRICI: la guardia deve essere sorda in produzione e
// rumorosa fuori.
//
// Il terzo protegge il pilota. Se qualcuno rendesse la guardia
// incondizionata, un verbo mancante smetterebbe di parcheggiare e
// comincerebbe a far tornare la card a "da prendere" (M1) con il
// gesto gia annotato (M2). Deve diventare rosso, non seguire.
//
// Il secondo protegge la COLLOCAZIONE. MISURATO in sandbox a
// novemtriginties: spostando la guardia al sito di persist, il suo
// lancio viene raccolto dal catch di rollback e la funzione
// ritorna {ok:false} invece di fallire -- cioe il sintomo assume
// la forma di M1 anche in sviluppo. Entrambi i pin DEV diventano
// rossi, ed e il comportamento voluto.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitApplyResult } from './applyHelper.js';

const LOG_WRITES = [
  { farmaco_id: 1, data: '2026-07-24', dose_numero: 1, stato: 'presa' },
];

function deps(op) {
  const dispatched = [];
  const repo = { upsertLogsBatch: vi.fn().mockResolvedValue([]) };
  const plan = [];
  const args = {
    dispatch: (a) => {
      dispatched.push(a);
    },
    getState: () => ({ plan, presoStack: [] }),
    repo,
    domainCall: () => ({ plan, prompt: null, logWrites: LOG_WRITES }),
    op,
  };
  return { args, dispatched, repo };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('commitApplyResult -- guardia di livello 1 sul verbo (s.6.261)', () => {
  it('DEV: un verbo fuori vocabolario SOLLEVA', async () => {
    vi.stubEnv('DEV', true);
    const { args } = deps('pres');

    await expect(commitApplyResult(args)).rejects.toThrow(/verbo di gesto/i);
  });

  it('DEV: solleva PRIMA di ogni dispatch e PRIMA di ogni persist', async () => {
    // Il cuore di D1: se la guardia stesse al sito di persist, il suo
    // lancio verrebbe raccolto dal catch di rollback e la card tornerebbe
    // a "da prendere". Qui si pretende che NULLA sia stato dispatchato e
    // che il repository non sia stato toccato: non ce nulla da annullare.
    vi.stubEnv('DEV', true);
    const { args, dispatched, repo } = deps(null);

    await expect(commitApplyResult(args)).rejects.toThrow();
    expect(dispatched).toHaveLength(0);
    expect(repo.upsertLogsBatch).not.toHaveBeenCalled();
  });

  it('PROD: NON solleva e il tocco viene persistito lo stesso', async () => {
    // Comportamento di produzione INVARIATO rispetto alla baseline: il
    // verbo mancante viaggia fino allo splitter, che parcheggia come
    // OP_SCONOSCIUTO (livello 2). Il tocco resta annotato: M2 salvo.
    vi.stubEnv('DEV', false);
    const { args, dispatched, repo } = deps(null);

    await expect(commitApplyResult(args)).resolves.toEqual({ ok: true });
    expect(repo.upsertLogsBatch).toHaveBeenCalledTimes(1);
    expect(repo.upsertLogsBatch).toHaveBeenCalledWith(LOG_WRITES, null);
    expect(dispatched.map((a) => a.type)).toContain('COMMIT_APPLY_RESULT');
  });

  it('DEV: un verbo del vocabolario passa senza ostacoli', async () => {
    vi.stubEnv('DEV', true);
    const { args, repo } = deps('presa');

    await expect(commitApplyResult(args)).resolves.toEqual({ ok: true });
    expect(repo.upsertLogsBatch).toHaveBeenCalledWith(LOG_WRITES, 'presa');
  });
});
