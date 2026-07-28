// ============================================================
// AvvisoConflittoCard.test -- CS-5.3-bis parte 2, P-2.
// ============================================================
//
// Form copied from UpdatePrompt.test.jsx, the measured sibling in this
// folder: `useTheme` is mocked to a stable token map even though it needs no
// provider, so the assertions never depend on theme state.
//
// The card is the M2 compensation for a dropped gesture, so the tests that
// matter are the ones that would go red if it became dismissable by accident
// or stopped rendering: C5 and C6 are a discriminating pair, and C10 is the
// positive control without which C1 and C2 would pass on a component that
// never renders at all.
//
// SENTINEL_QTRAMA_CARD_SUITE

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    dark: false,
    mode: 'auto',
    tokens: {
      modalOverlay: 'rgba(0,0,0,0.5)',
      modalBg: '#FFFFFF',
      textPrimary: '#1C1917',
      blue: '#2563EB',
    },
  }),
}));

import AvvisoConflittoCard from './AvvisoConflittoCard.jsx';

const COMPLETA = Object.freeze({
  esito: 'completa',
  testi: Object.freeze({
    titolo: 'Una registrazione non e andata a buon fine',
    fatti: 'Cardioaspirina, dose 2 del 24 luglio 2026. Avevi registrato alle 13:05.',
    spiegazione: 'Nei dati questa dose risulta gia diversa.',
    chiusura: 'Non devi fare niente adesso.',
    azione: 'Ho letto',
  }),
});

const DEGRADATA = Object.freeze({
  esito: 'degradata',
  testi: Object.freeze({
    titolo: 'Una registrazione non e andata a buon fine',
    fatti: 'I dettagli di questa registrazione non sono disponibili.',
    spiegazione: 'Nei dati questa dose risulta gia diversa.',
    chiusura: 'Non devi fare niente adesso.',
    azione: 'Ho letto',
  }),
});

describe('AvvisoConflittoCard (Q-LETTO-3=A, Q-LETTO-8=A, Q-TRAMA-4=A)', () => {
  let onLetto;

  beforeEach(() => {
    onLetto = vi.fn();
  });

  it('C1 non rende niente quando open e falso', () => {
    render(<AvvisoConflittoCard open={false} scheda={COMPLETA} onLetto={onLetto} />);
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();
  });

  it('C2 non rende niente senza scheda', () => {
    render(<AvvisoConflittoCard open scheda={null} onLetto={onLetto} />);
    expect(screen.queryByTestId('avviso-conflitto-card')).toBeNull();
  });

  it('C3 rende le QUATTRO righe della scheda completa', () => {
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    expect(screen.getByRole('heading')).toHaveTextContent(COMPLETA.testi.titolo);
    expect(screen.getByTestId('avviso-fatti')).toHaveTextContent(COMPLETA.testi.fatti);
    expect(screen.getByTestId('avviso-spiegazione')).toHaveTextContent(
      COMPLETA.testi.spiegazione,
    );
    expect(screen.getByTestId('avviso-chiusura')).toHaveTextContent(
      COMPLETA.testi.chiusura,
    );
  });

  it('C4 un SOLO bottone, ed e quello del riconoscimento', () => {
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    const bottoni = screen.getAllByRole('button');
    expect(bottoni).toHaveLength(1);
    expect(bottoni[0]).toHaveTextContent('Ho letto');
  });

  it('C5 il bottone chiama onLetto ESATTAMENTE una volta', async () => {
    const user = userEvent.setup();
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    await user.click(screen.getByRole('button', { name: /ho letto/i }));
    expect(onLetto).toHaveBeenCalledTimes(1);
  });

  it('C6 Escape NON congeda la scheda: resta finche letta (14.5 p.4)', async () => {
    // Coppia discriminante con C5: quello prova che onLetto si puo chiamare,
    // questo che Escape non lo chiama. Da solo, C6 sarebbe verde anche su un
    // componente che non chiama mai onLetto.
    const user = userEvent.setup();
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    await user.keyboard('{Escape}');
    expect(onLetto).not.toHaveBeenCalled();
    expect(screen.getByTestId('avviso-conflitto-card')).toBeInTheDocument();
  });

  it('C7 e una finestra di dialogo, e il titolo la nomina', () => {
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    const idTitolo = dialogo.getAttribute('aria-labelledby');
    expect(idTitolo).toBeTruthy();
    expect(screen.getByRole('heading').id).toBe(idTitolo);
  });

  it('C8 la scheda degradata ha la STESSA struttura e si distingue', () => {
    render(<AvvisoConflittoCard open scheda={DEGRADATA} onLetto={onLetto} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-esito', 'degradata');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByTestId('avviso-fatti')).toHaveTextContent(
      'I dettagli di questa registrazione non sono disponibili.',
    );
    expect(screen.getByTestId('avviso-chiusura')).toBeInTheDocument();
  });

  it('C9 nessun altro elemento interattivo dentro la scheda', () => {
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    const carta = screen.getByTestId('avviso-conflitto-card');
    expect(carta.querySelectorAll('a')).toHaveLength(0);
    expect(carta.querySelectorAll('input')).toHaveLength(0);
    expect(carta.querySelectorAll('button')).toHaveLength(1);
  });

  it('C10 CONTROLLO POSITIVO -- aperta e con scheda, RENDE', () => {
    // Senza questo, C1 e C2 sarebbero verdi su un componente che non rende
    // mai niente, cioe su un drop senza avviso.
    render(<AvvisoConflittoCard open scheda={COMPLETA} onLetto={onLetto} />);
    expect(screen.getByTestId('avviso-conflitto-card')).toBeInTheDocument();
  });
});
