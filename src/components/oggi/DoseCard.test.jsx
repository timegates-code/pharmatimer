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
    // delta_minuti = -5 → Anticipo label (|delta| <= TOLLERANZA_MIN so green).
    expect(screen.getByText('Anticipo')).toBeInTheDocument();
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
    renderWithProvider(
      <DoseCard entry={plan[1]} state="in_attesa" />,
      { stateOverrides: THEME_LIGHT }
    );
    expect(screen.getByText('+30 min')).toBeInTheDocument();
  });

  it('shows the "⚠ orario: domani" badge on a cross-midnight recalc (§6.26 workaround)', () => {
    // ora_prevista 23:00, ora_ricalcolata 07:00 → recalc "before" planned
    // by more than 60 min → isCrossMidnightRecalc = true.
    const crossEntry = {
      ...plan[0],
      ora_prevista: '23:00',
      ora_ricalcolata: '07:00',
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
// ============================================================

describe('DoseCard (interactive — Sessione 7c-1)', () => {
  const plan = buildTestPlan();
  // plan[0] = prevista (non-done) — for ALTRO tap
  // plan[1] = ricalcolata with gap_minuti=30 — for gap tap

  it('calls onAltro with the entry when the ALTRO pill is clicked (non-done card)', () => {
    const onAltro = vi.fn();
    const { container } = renderWithProvider(
      <DoseCard
        entry={plan[0]} state="prossima"
        onPresa={() => {}}
        onAltro={onAltro}
      />,
      { stateOverrides: THEME_LIGHT }
    );
    // ALTRO pill uses <span>ALTRO</span> inside a button; query the parent button by role + accessible name.
    fireEvent.click(within(container).getByRole('button', { name: 'Altre opzioni' }));
    expect(onAltro).toHaveBeenCalledTimes(1);
    expect(onAltro).toHaveBeenCalledWith(plan[0]);
  });

  it('calls onGapTap with the entry when the gap badge is tapped (gap_minuti > 0)', () => {
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
    expect(onGapTap).toHaveBeenCalledTimes(1);
    expect(onGapTap).toHaveBeenCalledWith(plan[1]);
  });

  it('calls onSaltataTap with the entry when the SALTATA label is tapped', () => {
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
    expect(onSaltataTap).toHaveBeenCalledWith(saltataEntry);
  });

  it('calls onSospesaTap with the entry when the SOSPESA label is tapped', () => {
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
    expect(onSospesaTap).toHaveBeenCalledWith(sospesaEntry);
  });
});
