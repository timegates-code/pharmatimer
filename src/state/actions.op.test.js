// @vitest-environment node
// ============================================================
// actions -- pin del VERBO DI GESTO (CS-4, s.6.261 livello 1).
// par.22.198-novemtriginties. SENTINEL_S6261_PIN_OP_THUNKS
// ------------------------------------------------------------
// Chiude il buco H3, misurato a untriginties e RIMISURATO qui: in
// tutto `src` non esisteva UNA sola asserzione sugli argomenti di
// `upsertLogsBatch`. I sette thunk passavano il proprio verbo per
// DISCIPLINA, non per costruzione: nessun test si sarebbe accorto
// di un refuso, e `commitApplyResult` porta `op = null` come
// default silenzioso.
//
// POSTA CLINICA. Un verbo assente o storpiato non perde nulla --
// lo elemento parcheggia come OP_SCONOSCIUTO (livello 2, R-4) e il
// parcheggio non scarta mai (M2 salvo). Ma una presa vera resta in
// attesa di mani umane invece di partire, e la persona la vede
// ferma in "Da controllare" senza averne colpa.
//
// PERCHE `applyHelper` E MOCKATO. Qui si pinna la CUCITURA
// thunk -> commitApplyResult, non il dominio. Far girare `recalc.js`
// pretenderebbe sette scenari di dominio validi e renderebbe questi
// pin fragili a modifiche che col verbo non hanno nulla a che fare.
// La guardia REALE e pinnata a parte, in applyHelper.opguard.test.js,
// dove `commitApplyResult` NON e mockato.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./applyHelper.js', () => ({
  commitApplyResult: vi.fn(async () => ({ ok: true })),
}));

import { createActions } from './actions.js';
import { commitApplyResult } from './applyHelper.js';
import { OUTBOX_OPS } from '../domain/outboxSplitter.js';

const KEY = '2026-07-24-1-1';

function makeHarness() {
  const dispatched = [];
  const state = {
    // status !== 'ready' tiene chiuso il gate di maybeReschedule: le
    // notifiche non sono materia di questo pin.
    status: 'init',
    simulatedNow: null,
    presoStack: [KEY],
    impostazioni: {},
    plan: [],
  };
  const dispatch = (a) => {
    dispatched.push(a);
  };
  const getState = () => state;
  const repo = { upsertLogsBatch: vi.fn().mockResolvedValue([]) };
  return { actions: createActions({ dispatch, getState, repo }), dispatched };
}

// Un caso per thunk. La lista e SCRITTA A MANO di proposito: derivarla
// da OUTBOX_OPS farebbe seguire al pin una eventuale rimozione invece
// di romperla, che e il difetto gia evitato in outboxSplitter.test.js.
const CASI = [
  ['presa', (a) => a.presa(KEY)],
  ['salta', (a) => a.salta(KEY)],
  ['sospendi', (a) => a.sospendi(KEY)],
  ['recupero', (a) => a.recupero(KEY, 30)],
  ['ripristina', (a) => a.ripristina(KEY, 'prevista')],
  ['annullaUltima', (a) => a.annullaUltima()],
  ['annullaAssunzione', (a) => a.annullaAssunzione(KEY)],
];

describe('thunk -> commitApplyResult: il verbo di gesto (Q-OP1 = A)', () => {
  beforeEach(() => {
    vi.mocked(commitApplyResult).mockClear();
  });

  for (const [verbo, invoca] of CASI) {
    it(`${verbo} inoltra op='${verbo}'`, async () => {
      const { actions } = makeHarness();

      await invoca(actions);

      expect(commitApplyResult).toHaveBeenCalledTimes(1);
      const args = vi.mocked(commitApplyResult).mock.calls[0][0];
      expect(args.op).toBe(verbo);
    });
  }

  it('i sette verbi osservati appartengono tutti a OUTBOX_OPS', async () => {
    const osservati = [];
    for (const [, invoca] of CASI) {
      vi.mocked(commitApplyResult).mockClear();
      const { actions } = makeHarness();
      await invoca(actions);
      osservati.push(vi.mocked(commitApplyResult).mock.calls[0][0].op);
    }

    expect(osservati).toHaveLength(7);
    for (const op of osservati) {
      expect(OUTBOX_OPS, `verbo fuori vocabolario: ${op}`).toContain(op);
    }
    // Nessun verbo riusato da due gesti diversi.
    expect(new Set(osservati).size).toBe(7);
  });
});
