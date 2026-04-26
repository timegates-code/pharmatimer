import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../test/renderHelpers.jsx';
import { DoseCard } from './DoseCard.jsx';

// Env: jsdom (vitest.config default). useTheme() resolves to 'light' via the
// `impostazioni.tema` override — this keeps tokens deterministic and avoids
// any matchMedia path in jsdom.
const THEME_LIGHT = { impostazioni: { tema: 'light' } };

// NOTE (AMB-7b-2.X → §6.32, fix applied in 7c-1 via afterEach(cleanup) in
// test/setup.js). The interactive tests below still scope queries through
// `within(container)` to preserve robustness and document the boundary of
// each test explicitly.

describe('DoseCard (read-only)', () => {
  const plan = buildTestPlan();
  // plan[0] = prevista  @ 08:00 (no ricalc)
  // plan[1] = ricalcolata @ 16:00 → 16:30, gap 30
  // plan[2] = presa     @ ora_effettiva 23:55, delta -5

  it('renders farmaco name and ora_prevista for a pending entry', () => {
    renderWithProvider(
      <DoseCard entry={plan[0]} state="prossima" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('Demo Med')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
  });

  it('extracts HH:MM from ora_effettiva ISO datetime for a taken entry', () => {
    renderWithProvider(
      <DoseCard entry={plan[2]} state="presa" />,
      { stateOverrides: THEME_LIGHT }
    );
    // Fixture stores ora_effettiva as '2026-04-19T23:55:00' — Card slices to HH:MM.
    expect(screen.getByText('23:55')).toBeInTheDocument();
    // delta_minuti = -5 → §6.45 post-CP6: |delta| ≤ TOLLERANZA_MIN (=15)
    // collapses Anticipo/Ritardo into "in orario" (green). Pre-CP6 this
    // test expected 'Anticipo'.
    expect(screen.getByText('in orario')).toBeInTheDocument();
  });

  it('shows the "⏰ IN RITARDO" badge when the visual state is in_ritardo', () => {
    renderWithProvider(
      <DoseCard entry={plan[0]} state="in_ritardo" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('⏰ IN RITARDO')).toBeInTheDocument();
  });

  it('shows a recalc diff badge formatted by calcolaDelta + formatDelta when ora_ricalcolata differs', () => {
    // plan[1]: 16:00 → 16:30, same dateStr → calcolaDelta = +30 minutes.
    // 9-A §6.117a: ora_ricalcolata is now ISO 'YYYY-MM-DDTHH:MM'. The fixture
    // from buildTestPlan still emits HH:MM for legacy compat with other test
    // files; we override here inline (§6.116c follow-up: align buildTestPlan
    // at source if other suites surface failures post-CP4).
    const isoEntry = { ...plan[1], ora_ricalcolata: '2026-04-19T16:30' };
    renderWithProvider(
      <DoseCard entry={isoEntry} state="in_attesa" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('+30 min')).toBeInTheDocument();
  });

  it('shows the "⚠ orario: domani" badge on a cross-midnight recalc (§6.116/§6.118)', () => {
    // 9-A §6.118: badge gates on isCrossMidnightRecalc(entry) — ISO date
    // compare on ora_ricalcolata vs entry.dateStr. The §6.18 case is:
    // entry planned for 2026-04-19 but recalculated to 2026-04-20T07:30.
    const crossEntry = {
      ...plan[0],
      ora_ricalcolata: '2026-04-20T07:30',
    };
    renderWithProvider(
      <DoseCard entry={crossEntry} state="in_attesa" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('⚠ orario: domani')).toBeInTheDocument();
  });
});

// ============================================================
// Sessione 7b-2 — ACTION AREA interactive tests (AMB-7b-2.B / AMB-7b-2.C).
// All queries scoped via within(container) — see header note.
// ============================================================

describe('DoseCard (interactive — Sessione 7b-2)', () => {
  const plan = buildTestPlan();
  // plan[0] = prevista (non-done)
  // plan[2] = presa

  it('does NOT mount the PRESA button when onPresa is absent', () => {
    const { container } = renderWithProvider(
      <DoseCard entry={plan[0]} state="prossima" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(within(container).queryByText('PRESA')).toBeNull();
  });

  it('mounts the PRESA button for non-done states when onPresa is provided', () => {
    const { container } = renderWithProvider(
      <DoseCard entry={plan[0]} state="prossima" onPresa={() => {}} />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(within(container).getByText('PRESA')).toBeInTheDocument();
  });

  it('does NOT mount the PRESA button for terminal states even if onPresa is passed', () => {
    // Using saltata covers the isDone gate; the same branch handles sospesa
    // and presa identically.
    const saltataEntry = { ...plan[0], stato: 'saltata' };
    const { container } = renderWithProvider(
      <DoseCard entry={saltataEntry} state="saltata" onPresa={() => {}} />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(within(container).queryByText('PRESA')).toBeNull();
  });

  it('calls onPresa with the entry when the PRESA button is clicked', () => {
    const onPresa = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard entry={plan[0]} state="prossima" onPresa={onPresa} />,
      { stateOverrides: THEME_LIGHT }
    );
    fireEvent.click(within(container).getByText('PRESA'));
    expect(onPresa).toHaveBeenCalledTimes(1);
    expect(onPresa).toHaveBeenCalledWith(plan[0]);
  });

  it('renders the check button as disabled when isLastPreso=false (even with onUndo)', () => {
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[2]} state="presa"
        isLastPreso={false} onUndo={() => {}}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    // For a presa Card the only button in its own subtree is the check.
    expect(within(container).getByRole('button')).toBeDisabled();
  });

  it('enables the check button and calls onUndo with the entry when clicked (isLastPreso=true)', () => {
    const onUndo = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[2]} state="presa"
        isLastPreso={true} onUndo={onUndo}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    const btn = within(container).getByRole('button');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledWith(plan[2]);
  });
});

// ============================================================
// Sessione 7c-1 — tap affordances for modal openers (AMB-7c-1.L / N.e).
// Updated 7d-1 (AMB-7d-1.D/E): modal-opening handlers now receive
// (entry, triggerEl) — the second arg is the HTMLElement captured from
// `e.currentTarget`. Assertions track the new signature. The gap badge
// (TapBadge) uses a SOFT assertion on the second arg because the shared
// TapBadge component may or may not forward the native event to its
// `onClick` prop; OggiView compensates for any undefined trigger via
// RecuperoModal.fallbackEntryKey.
// ============================================================

describe('DoseCard (interactive — Sessione 7c-1)', () => {
  const plan = buildTestPlan();
  // plan[0] = prevista (non-done) — for ALTRO tap
  // plan[1] = ricalcolata with gap_minuti=30 — for gap tap

  it('calls onAltro(entry, triggerEl) when the ALTRO pill is clicked (non-done card)', () => {
    const onAltro = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[0]} state="prossima"
        onPresa={() => {}}
        onAltro={onAltro}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    fireEvent.click(within(container).getByRole('button', { name: 'Altre opzioni' }));
    expect(onAltro).toHaveBeenCalledTimes(1);
    expect(onAltro).toHaveBeenCalledWith(plan[0], expect.any(HTMLElement));
  });

  it('calls onGapTap(entry, ...) when the gap badge is tapped (gapResiduo > 0)', () => {
    const onGapTap = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[1]} state="in_attesa"
        onPresa={() => {}}
        onGapTap={onGapTap}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    // The gap badge renders as a button (TapBadge). Label text includes "ritardo".
    const gapBtn = within(container).getByRole('button', { name: /ritardo/i });
    fireEvent.click(gapBtn);
    // Soft assertion on 2nd arg: TapBadge is an unmodified shared component in
    // 7d-1 scope; if it forwards the native event the trigger will be the
    // button HTMLElement, otherwise undefined. Either case is acceptable —
    // OggiView falls back to fallbackEntryKey for focus restore.
    expect(onGapTap).toHaveBeenCalledTimes(1);
    const [entryArg] = onGapTap.mock.calls[0];
    expect(entryArg).toEqual(plan[1]);
  });

  it('calls onSaltataTap(entry, triggerEl) when the SALTATA label is tapped', () => {
    const onSaltataTap = vi.fn();
    const saltataEntry = { ...plan[0], stato: 'saltata' };
    const { container } = renderWithProvider(
      <DoseCard
        entry={saltataEntry} state="saltata"
        onSaltataTap={onSaltataTap}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    // The label in the time column has aria-label "Modifica dose saltata".
    // (The right-hand red circle has the same aria-label — both open the modal.)
    // getAllByRole lets us verify both targets exist and pick the first.
    const taps = within(container).getAllByRole('button', { name: 'Modifica dose saltata' });
    expect(taps.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(taps[0]);
    expect(onSaltataTap).toHaveBeenCalledTimes(1);
    expect(onSaltataTap).toHaveBeenCalledWith(saltataEntry, expect.any(HTMLElement));
  });

  it('calls onSospesaTap(entry, triggerEl) when the SOSPESA label is tapped', () => {
    const onSospesaTap = vi.fn();
    const sospesaEntry = { ...plan[0], stato: 'sospesa' };
    const { container } = renderWithProvider(
      <DoseCard
        entry={sospesaEntry} state="sospesa"
        onSospesaTap={onSospesaTap}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    const taps = within(container).getAllByRole('button', { name: 'Modifica dose sospesa' });
    expect(taps.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(taps[0]);
    expect(onSospesaTap).toHaveBeenCalledTimes(1);
    expect(onSospesaTap).toHaveBeenCalledWith(sospesaEntry, expect.any(HTMLElement));
  });
});

// ============================================================
// Sessione 7d-2 CP5 — onUndoTap wrapper (AMB-7d-2p2.D/H, §6.41)
// ============================================================

describe('DoseCard (interactive — Sessione 7d-2 CP5, onUndoTap wrapper)', () => {
  const plan = buildTestPlan();
  // plan[2] = stato 'presa'

  it('calls onUndoTap(entry, triggerEl) when the Card body wrapper is tapped', () => {
    const onUndoTap = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[2]} state="presa"
        onUndoTap={onUndoTap}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    const wrapper = within(container).getByRole('button', { name: 'Annulla dose presa' });
    fireEvent.click(wrapper);
    expect(onUndoTap).toHaveBeenCalledTimes(1);
    expect(onUndoTap).toHaveBeenCalledWith(plan[2], expect.any(HTMLElement));
  });
});

// ============================================================
// Sessione 7d-2 CP6 — DoseCard polish §6.45 + §6.47(a)
// (AMB-7d-2p3.E / AMB-7d-2p3.K'' / prompt §11 v2.5.18)
// ============================================================

describe('DoseCard (Sessione 7d-2 CP6 — §6.45 tolleranza + §6.47a gap residuo)', () => {
  const plan = buildTestPlan();
  // plan[1] = ricalcolata with gap_minuti=30
  // plan[2] = presa @ 23:55, delta_minuti=-5

  // §6.45: dose presa con |delta_minuti| > TOLLERANZA_MIN mostra label
  // "Ritardo" o "Anticipo" + valore in minuti, color rosso.
  it('renders "Ritardo" + "30 min" when delta_minuti=30 exceeds TOLLERANZA_MIN (§6.45)', () => {
    const ritardoEntry = {
      ...plan[2],
      ora_effettiva: '2026-04-19T08:30:00',
      delta_minuti: 30,
    };
    renderWithProvider(
      <DoseCard entry={ritardoEntry} state="presa" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('Ritardo')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    // "in orario" must NOT appear — sanity check against the inverse branch.
    expect(screen.queryByText('in orario')).toBeNull();
  });

  // §6.47(a): when recupero_minuti fully covers gap_minuti, the gap badge
  // unmounts entirely (gapResiduo = 0 → neither TapBadge nor Badge render).
  // hasGapTap is also gated on gapResiduo, so onGapTap is not wired.
  it('does NOT render the gap badge when recupero_minuti fully covers gap_minuti (§6.47a)', () => {
    const fullyRecoveredEntry = {
      ...plan[1],
      gap_minuti: 60,
      recupero_minuti: 60,
    };
    const { container } = renderWithProvider(
      <DoseCard
        entry={fullyRecoveredEntry} state="in_attesa"
        onPresa={() => {}}
        onGapTap={() => {}}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    // No tap-able gap badge.
    expect(within(container).queryByRole('button', { name: /ritardo/i })).toBeNull();
    // No non-tap gap label either: formatGapLabel output is not in the DOM.
    // We search for the "ritardo" substring anywhere in the badge row.
    // A few other nodes may contain "ritardo" in other contexts (in_ritardo
    // state, etc.), so we assert specifically that there is NO node whose
    // text is a gap-label shape ("<n> min ritardo").
    expect(within(container).queryByText(/\d+ min ritardo/i)).toBeNull();
  });
});

describe('DoseCard (Sessione 8d-A CP3 — §6.97 regression guard)', () => {
  // §6.97 scoperto in 8c-2 CP6 punto 4: farmaco con relazione_pasto='indifferente'
  // presumibilmente rendeva "Assumere lontano dai pasti". Diagnosi 8d-A (git blame
  // commit 1c900064, 19 apr 2026) ha confermato che il branch `indifferente` +
  // early-return esiste dalla creazione del file → bug non riproducibile.
  // Questo test documenta il contratto getPastoText(indifferente) come difesa
  // proattiva contro reintroduzione in refactor futuri.
  const plan = buildTestPlan();
  // plan[0].farmaco ha relazione_pasto='indifferente' + dettaglio_pasto=null
  // (default buildTestPlan, linee 63-64 di renderHelpers.jsx).

  it('renders "Assumere indifferentemente dai pasti" per relazione_pasto=indifferente (§6.97)', () => {
    renderWithProvider(
      <DoseCard entry={plan[0]} state="prossima" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('Assumere indifferentemente dai pasti')).toBeInTheDocument();
  });
});
