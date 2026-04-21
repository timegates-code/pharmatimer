// ============================================================
// OggiView — integration tests for auto-prompt gap recovery.
// Sessione 7c-2 (AMB-7c-2.G / Changelog §11 CP4).
//
// Scope. These tests exercise the FULL chain state↔reducer↔actions↔
// RecuperoModal↔OggiView useEffect with the REAL AppProvider.
// The LocalRepository singleton is substituted at the module-import
// boundary by a vi.mock that returns a Proxy — the Proxy forwards
// every property read to a `hoist.repo` that beforeEach replaces with
// a fresh `makeFakeRepo()` per test (§6.49 retrofit of AppProvider
// with initialStateProp is deferred to 7d).
//
// Coverage map (10 scenarios).
//   1  no prompt on mount → no auto-modal
//   2  prompt set via presa → auto-opens RecuperoModal
//   3  prompt set + AltroModal open → auto suspended
//   4  E2E large delta on N → prompt emitted on N+1
//   5  E2E small delta on N → no prompt
//   6  close auto-modal → dismissPrompt fires (source='auto')
//   7  manual close on prompt's own entry → dismissPrompt fires
//         (AMB-7c-2.E second branch, F)
//   8  manual close on a DIFFERENT entry → no dismiss
//         (AMB-7c-2.E second branch, key mismatch)
//   9  apply Anticipa → commit chain clears prompt (§6.48)
//         + plan reflects recupero_minuti
//   10 Ripristina path via direct thunk recupero(key, 0) → commit
//         chain clears prompt. The UI wiring of the "Ripristina"
//         button is covered in RecuperoModal.test.jsx; this test
//         verifies only the §6.48 commit-chain contract end-to-end,
//         because the button is conditional on recupero_minuti > 0
//         and thus not visible at the first prompt.
//
// Notes on #7 and #8 (race synthesis).
//   AMB-7c-2.F labels "manual same-entry" a RACE outcome. Auto
//   normally fires first; the only clean way in tests to reach the
//   "manual with prompt still set" branch is to convert an already-
//   open auto modal into a manual one by tapping the gap badge (for
//   #7 the same entry, for #8 a different one). The tap handler
//   simply overwrites `recuperoModal` state — a single instance is
//   reused (AMB-7c-2.B), so no unmount/remount is observable.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';

// ------------------------------------------------------------
// Mock boundary — Proxy pattern (see header "Scope").
// ------------------------------------------------------------

const hoist = vi.hoisted(() => ({ repo: null }));

vi.mock('../../data/repository/index.js', () => {
  const proxy = new Proxy({}, {
    get(_, prop) {
      // Vitest / Jest occasionally probe for `.then` to decide if a value
      // is thenable; symbols are used by React / internals. Short-circuit
      // both to avoid spurious errors before `beforeEach` has initialized.
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      const r = hoist.repo;
      if (!r) {
        throw new Error(
          `fakeRepo read before init (prop="${String(prop)}"). ` +
          `Did the test forget beforeEach(() => { hoist.repo = makeFakeRepo(); })?`
        );
      }
      return r[prop];
    },
  });
  return {
    repo: proxy,
    getRepository: () => hoist.repo,
  };
});

// Imports below the mock (vi.mock is hoisted to the very top anyway; this
// placement is just convention for readability).
import {
  DEFAULT_SEED,
  makeFakeRepo,
  renderWithRealProvider,
  waitForReady,
  runAction,
} from '../../test/renderWithRealProvider.jsx';
import OggiView from './OggiView.jsx';

// ------------------------------------------------------------
// Seeds
// ------------------------------------------------------------
//
// SEED_TWO_FARMACI: identical schedule on two farmaci so that after
// two sequential presa events BOTH dose2 entries have gap_minuti > 0
// (two visible gap badges), while state.prompt is ephemeral (§6.48)
// and points only to the LATEST — enabling #8's "other entry" test.
const SEED_TWO_FARMACI = {
  ...DEFAULT_SEED,
  farmaci: [
    DEFAULT_SEED.farmaci[0],
    {
      id: 2,
      nome: 'FarmacoTest2',
      // 'intervallo' required for cascade (see DEFAULT_SEED note in helper).
      tipo_frequenza: 'intervallo',
      intervallo_ore: 4,
      intervallo_minimo_ore: 3,
      dosi_giornaliere: 2,
      relazione_pasto: 'indifferente',
      data_inizio: '2026-01-01',
      data_fine: null,
      attivo: 1,
    },
  ],
  orari: [
    ...DEFAULT_SEED.orari,
    { id: 3, farmaco_id: 2, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'colazione' },
    { id: 4, farmaco_id: 2, dose_numero: 2, offset_minuti: 0, ancora_riferimento: 'pranzo' },
  ],
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Return today's plan entries for a given farmaco_id, sorted by
 * ora_prevista ascending. `today` is taken from state.lastBuiltForDay
 * (what the provider actually rendered a plan for), not from the wall
 * clock, so stale dates never infiltrate.
 */
function todayDosesFor(state, farmacoId) {
  const today = state.lastBuiltForDay;
  return state.plan
    .filter((e) => e.dateStr === today && e.farmaco.id === farmacoId)
    .sort((a, b) => a.ora_prevista.localeCompare(b.ora_prevista));
}

beforeEach(() => {
  hoist.repo = makeFakeRepo();
});

// ============================================================
// Tests
// ============================================================

describe('OggiView — auto-prompt gap recovery (Sessione 7c-2)', () => {
  it('[1] does NOT auto-open RecuperoModal when state.prompt is null on mount', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    expect(ctxRef.current.state.prompt).toBeNull();
    expect(screen.queryByTestId('recupero-modal')).toBeNull();
  });

  it('[2] auto-opens RecuperoModal when state.prompt becomes gap_recovery (source=auto)', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    expect(ctxRef.current.state.prompt?.kind).toBe('gap_recovery');
    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();
  });

  it('[3] suspends auto-prompt while AltroModal is open (guard AMB-7c-2.C)', async () => {
    const { ctxRef, container } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);

    // Open AltroModal first (tap the ALTRO pill of the earliest pending dose).
    const altroBtn = within(container).getAllByRole('button', { name: 'Altre opzioni' })[0];
    fireEvent.click(altroBtn);
    expect(screen.getByTestId('altro-modal')).toBeInTheDocument();

    // Now trigger the prompt via thunk. With AltroModal open, the useEffect
    // guard must early-return even though state.prompt is set.
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    expect(ctxRef.current.state.prompt?.kind).toBe('gap_recovery');
    expect(screen.getByTestId('altro-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('recupero-modal')).toBeNull();
  });

  it('[4] E2E: presa with large delta (+3h on 08:00 dose) emits gap_recovery prompt', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    expect(ctxRef.current.state.prompt).toMatchObject({ kind: 'gap_recovery' });
    expect(ctxRef.current.state.prompt.entryKey).toBeTruthy();
  });

  it('[5] E2E: presa with small delta (+20 min) does NOT emit a prompt', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('08:20'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    expect(ctxRef.current.state.prompt).toBeNull();
    expect(screen.queryByTestId('recupero-modal')).toBeNull();
  });

  it('[6] close auto-modal dismisses the prompt (source=auto branch)', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();
    expect(ctxRef.current.state.prompt?.kind).toBe('gap_recovery');

    await runAction(() => fireEvent.click(screen.getByRole('button', { name: 'Chiudi' })));

    expect(ctxRef.current.state.prompt).toBeNull();
    expect(screen.queryByTestId('recupero-modal')).toBeNull();
  });

  it('[7] manual close on the prompt\u2019s own entry dismisses the prompt (AMB-E branch 2, F)', async () => {
    const { ctxRef, container } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    // Modal is currently open as source='auto' on the prompted entry.
    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();

    // Tap the only visible gap badge — same entry the prompt targets.
    // This converts the open modal's state to source='manual' (same instance).
    const gapBtn = within(container).getByRole('button', { name: /ritardo/i });
    await runAction(() => fireEvent.click(gapBtn));

    // Modal remains open, prompt still pending.
    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();
    expect(ctxRef.current.state.prompt?.kind).toBe('gap_recovery');

    // Close — branch 2 of AMB-E (source='manual', key matches) → dismissPrompt.
    await runAction(() => fireEvent.click(screen.getByRole('button', { name: 'Chiudi' })));

    expect(ctxRef.current.state.prompt).toBeNull();
  });

  it('[8] manual close on a DIFFERENT entry does NOT dismiss the prompt', async () => {
    hoist.repo = makeFakeRepo(SEED_TWO_FARMACI);

    const { ctxRef, container } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [f1d1] = todayDosesFor(ctxRef.current.state, 1);
    const [f2d1] = todayDosesFor(ctxRef.current.state, 2);

    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    // First presa: prompt on farmaco1.dose2 (intermediate state).
    await runAction(() => ctxRef.current.actions.presa(f1d1.key));
    // Second presa: ephemeral (§6.48) overwrites prompt to farmaco2.dose2.
    // farmaco1.dose2 still carries gap_minuti > 0 (unchanged), just no
    // longer the prompt target. Both dose2s now show a gap badge.
    await runAction(() => ctxRef.current.actions.presa(f2d1.key));

    const [, f1d2] = todayDosesFor(ctxRef.current.state, 1);
    const [, f2d2] = todayDosesFor(ctxRef.current.state, 2);
    expect(f1d2.gap_minuti).toBeGreaterThan(0);
    expect(f2d2.gap_minuti).toBeGreaterThan(0);
    expect(ctxRef.current.state.prompt.entryKey).toBe(f2d2.key);
    expect(f1d2.key).not.toBe(f2d2.key);

    // Auto modal is currently open on farmaco2.dose2 (the prompt target).
    // Two gap badges are rendered. We need to tap farmaco1.dose2's badge
    // (the NON-prompted one). Assumption: DOM order mirrors plan sort
    // order (ora_prevista asc, then farmaco_id asc), so gapBtns[0] is
    // farmaco1.dose2 and gapBtns[1] is farmaco2.dose2.
    const gapBtns = within(container).getAllByRole('button', { name: /ritardo/i });
    expect(gapBtns.length).toBe(2);
    await runAction(() => fireEvent.click(gapBtns[0]));

    // Modal still open (now source='manual', entry=f1d2).
    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();

    const promptKeyBefore = ctxRef.current.state.prompt.entryKey;

    // Close — branch 2 of AMB-E, key mismatch → NO dismiss.
    await runAction(() => fireEvent.click(screen.getByRole('button', { name: 'Chiudi' })));

    expect(ctxRef.current.state.prompt).not.toBeNull();
    expect(ctxRef.current.state.prompt.entryKey).toBe(promptKeyBefore);
    // Side-effect: useEffect will naturally re-open the auto-modal for
    // the still-pending prompt on f2d2. Not asserted here (covered by #2).
  });

  it('[9] Anticipa clears the prompt via commit chain and updates plan.recupero_minuti', async () => {
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    const promptEntryKey = ctxRef.current.state.prompt.entryKey;
    expect(screen.getByTestId('recupero-modal')).toBeInTheDocument();

    // Drag slider to 30 minutes (step=5, guaranteed within calcolaRecuperoMax
    // for a 90-min gap on intervallo_minimo=3h).
    const slider = screen.getByLabelText('Minuti da recuperare');
    await runAction(() => fireEvent.change(slider, { target: { value: '30' } }));

    // Primary button label becomes "Anticipa di 30 min".
    const applyBtn = screen.getByRole('button', { name: /Anticipa di/i });
    await runAction(() => fireEvent.click(applyBtn));

    // Prompt cleared by COMMIT_APPLY_RESULT (§6.48 ephemeral).
    expect(ctxRef.current.state.prompt).toBeNull();
    expect(screen.queryByTestId('recupero-modal')).toBeNull();

    // Plan updated: target entry carries the applied recupero.
    const targetAfter = ctxRef.current.state.plan.find((e) => e.key === promptEntryKey);
    expect(targetAfter).toBeDefined();
    expect(targetAfter.recupero_minuti).toBe(30);
  });

  it('[10] recupero(key, 0) path clears the prompt via commit chain', async () => {
    // Ripristina button is conditional on entry.recupero_minuti > 0
    // (see RecuperoModal.jsx `hasExisting`) and thus not visible at
    // the first prompt. We exercise the thunk directly to verify the
    // §6.48 commit-chain contract — the UI wiring "Ripristina → onReset
    // → recupero(key, 0)" is covered in RecuperoModal.test.jsx.
    const { ctxRef } = renderWithRealProvider(<OggiView />);
    await waitForReady(ctxRef);

    const [dose1] = todayDosesFor(ctxRef.current.state, 1);
    await runAction(() => ctxRef.current.actions.setSimulatedNow('11:00'));
    await runAction(() => ctxRef.current.actions.presa(dose1.key));

    const promptEntryKey = ctxRef.current.state.prompt.entryKey;
    expect(ctxRef.current.state.prompt.kind).toBe('gap_recovery');

    await runAction(() => ctxRef.current.actions.recupero(promptEntryKey, 0));

    expect(ctxRef.current.state.prompt).toBeNull();
  });
});
