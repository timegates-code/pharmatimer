// @vitest-environment node
// ============================================================
// actions.annullaAssunzione() — thunk tests (Sessione 7d-2 CP4, §6.41).
// ============================================================
//
// Scope:
//   (1) Success: COMMIT_APPLY_RESULT then REMOVE_PRESO_KEY dispatched in
//       order; repo.upsertLogsBatch called once.
//   (2) Guard DOWNSTREAM_USER_EDITS: SET_ERROR dispatched with
//       kind:'domain' and code:'DOWNSTREAM_USER_EDITS' when N+1 is 'presa';
//       no commit, no persist.

import { describe, it, expect, vi } from 'vitest';
import { createActions } from './actions.js';

const FARMACO = {
  id: 1,
  nome: 'TestMed',
  tipo_frequenza: 'intervallo',
  intervallo_ore: 8,
  intervallo_minimo_ore: 4,
  dosi_giornaliere: 2,
  relazione_pasto: 'indifferente',
  data_inizio: '2020-01-01',
  data_fine: null,
  attivo: 1,
};

const ORARIO_1 = {
  id: 1, farmaco_id: 1, dose_numero: 1,
  offset_minuti: 0, ancora_riferimento: 'colazione',
};
const ORARIO_2 = {
  id: 2, farmaco_id: 1, dose_numero: 2,
  offset_minuti: 0, ancora_riferimento: 'pranzo',
};

function makeEntry(overrides = {}) {
  const doseNumero = overrides.doseNumero ?? 1;
  return {
    key: `2026-04-21-${FARMACO.id}-${doseNumero}`,
    farmaco: FARMACO,
    orario: doseNumero === 2 ? ORARIO_2 : ORARIO_1,
    dateStr: '2026-04-21',
    ora_prevista: '08:00',
    ora_effettiva: null,
    delta_minuti: null,
    ora_ricalcolata: null,
    ora_ricalcolata_originale: null,
    gap_minuti: 0,
    gap_originale: 0,
    recupero_minuti: 0,
    stato: 'prevista',
    dose_prec_saltata: false,
    ...overrides,
  };
}

function buildHappyPlan() {
  const target = makeEntry({
    doseNumero: 1,
    stato: 'presa',
    ora_effettiva: '2026-04-21T10:00:00',
    delta_minuti: 120,
  });
  const nextAuto = makeEntry({
    doseNumero: 2,
    stato: 'ricalcolata',
    ora_prevista: '16:00',
    ora_ricalcolata: '18:00',
    ora_ricalcolata_originale: '18:00',
    gap_minuti: 120,
    gap_originale: 120,
  });
  return [target, nextAuto];
}

function buildGuardFailPlan() {
  const target = makeEntry({
    doseNumero: 1,
    stato: 'presa',
    ora_effettiva: '2026-04-21T10:00:00',
    delta_minuti: 120,
  });
  const nextUserPresa = makeEntry({
    doseNumero: 2,
    stato: 'presa',
    ora_prevista: '16:00',
    ora_effettiva: '2026-04-21T16:30:00',
    delta_minuti: 30,
  });
  return [target, nextUserPresa];
}

function makeHarness({ plan, presoStack = [] }) {
  let state = { plan, presoStack, simulatedNow: null, prompt: null };
  const dispatched = [];
  const dispatch = (a) => {
    dispatched.push(a);
    if (a.type === 'COMMIT_APPLY_RESULT') {
      state = { ...state, plan: a.payload.plan, prompt: a.payload.prompt };
    } else if (a.type === 'REMOVE_PRESO_KEY') {
      state = {
        ...state,
        presoStack: state.presoStack.filter((k) => k !== a.payload),
      };
    } else if (a.type === 'SET_PLAN') {
      state = { ...state, plan: a.payload };
    }
  };
  const getState = () => state;
  const repo = { upsertLogsBatch: vi.fn().mockResolvedValue([]) };
  const actions = createActions({ dispatch, getState, repo });
  return { actions, dispatched, repo };
}

describe('annullaAssunzione thunk (Sessione 7d-2 CP4, §6.41)', () => {
  it('success: dispatches COMMIT_APPLY_RESULT then REMOVE_PRESO_KEY and persists logs', async () => {
    const plan = buildHappyPlan();
    const targetKey = plan[0].key;
    const { actions, dispatched, repo } = makeHarness({
      plan,
      presoStack: [targetKey],
    });

    const result = await actions.annullaAssunzione(targetKey);

    expect(result).toEqual({ ok: true });
    const types = dispatched.map((a) => a.type);
    expect(types).toContain('COMMIT_APPLY_RESULT');
    expect(types).toContain('REMOVE_PRESO_KEY');
    expect(types.indexOf('REMOVE_PRESO_KEY')).toBeGreaterThan(
      types.indexOf('COMMIT_APPLY_RESULT')
    );
    expect(repo.upsertLogsBatch).toHaveBeenCalledTimes(1);

    const removeAction = dispatched.find((a) => a.type === 'REMOVE_PRESO_KEY');
    expect(removeAction.payload).toBe(targetKey);
  });

  it('guard fail: dispatches SET_ERROR with code DOWNSTREAM_USER_EDITS; no commit nor persist', async () => {
    const plan = buildGuardFailPlan();
    const targetKey = plan[0].key;
    const { actions, dispatched, repo } = makeHarness({
      plan,
      presoStack: [targetKey],
    });

    const result = await actions.annullaAssunzione(targetKey);

    expect(result).toEqual({ ok: false, code: 'DOWNSTREAM_USER_EDITS' });
    const types = dispatched.map((a) => a.type);
    expect(types).not.toContain('COMMIT_APPLY_RESULT');
    expect(types).not.toContain('REMOVE_PRESO_KEY');

    const errorAction = dispatched.find((a) => a.type === 'SET_ERROR');
    expect(errorAction).toBeDefined();
    expect(errorAction.payload.kind).toBe('domain');
    expect(errorAction.payload.code).toBe('DOWNSTREAM_USER_EDITS');
    expect(repo.upsertLogsBatch).not.toHaveBeenCalled();
  });
});
