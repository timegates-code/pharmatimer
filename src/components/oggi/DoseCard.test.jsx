import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../test/renderHelpers.jsx';
import { DoseCard } from './DoseCard.jsx';

// Env: jsdom (vitest.config default). useTheme() resolves to 'light' via the
// `impostazioni.tema` override — this keeps tokens deterministic and avoids
// any matchMedia path in jsdom.
const THEME_LIGHT = { impostazioni: { tema: 'light' } };

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
