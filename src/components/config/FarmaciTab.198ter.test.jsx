// ============================================================
// FarmaciTab — par.22.198-ter cluster UX (P1 + P3 + P14 + B24).
// SENTINEL_PAR_22_198_TER_TESTS
//
// P1: progressive disclosure — form vergine Nome+Tipo+Note (D1).
// P3: modalita' orari 'Ai pasti' / 'Orari specifici' con prefill
//     a passi di intervallo (D3, one-shot allo switch).
// P14: avviso non bloccante dosi odierne gia' trascorse (D4),
//      pattern fake-Date s.6.243 (toFake: ['Date']).
// B24: header lista sticky sotto ConfigTabBar (D5), smoke.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import FarmaciTab from './FarmaciTab.jsx';

function buildProfiloAttivo() {
  return {
    id: 1, nome_profilo: 'Standard',
    ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
    attivo: 1,
  };
}

function renderTab(overrides = {}) {
  return renderWithProvider(<FarmaciTab />, {
    stateOverrides: {
      farmaci: [],
      profili: [buildProfiloAttivo()],
      ...overrides,
    },
  });
}

describe('FarmaciTab — P1 progressive disclosure (par.22.198-ter)', () => {
  it('form vergine mostra solo Nome, Tipo frequenza e Note; sezioni gated assenti', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    expect(within(drawer).getByLabelText(/^Nome/)).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Fisso')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Note')).toBeInTheDocument();

    expect(within(drawer).queryByLabelText('Principio attivo')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Funzione')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Dosi giornaliere')).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText(/^Relazione/)).not.toBeInTheDocument();
    expect(within(drawer).queryByTestId('orario-row-0')).not.toBeInTheDocument();
  });

  it('selezione tipo Fisso rivela anagrafica estesa, dosi, orari e Avanzate', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    await user.click(within(drawer).getByLabelText('Fisso'));

    expect(within(drawer).getByLabelText('Principio attivo')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Dosi giornaliere')).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/^Relazione/)).toBeInTheDocument();
    expect(within(drawer).getByTestId('orario-row-0')).toBeInTheDocument();
  });
});

describe('FarmaciTab — P3 modalita\u0027 orari (par.22.198-ter)', () => {
  async function setupIntervallo() {
    const user = userEvent.setup();
    renderTab();
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    await user.click(within(drawer).getByLabelText('A intervallo'));
    fireEvent.change(within(drawer).getByLabelText('Ore'), { target: { value: '6' } });
    fireEvent.change(within(drawer).getByLabelText('Dosi giornaliere'), { target: { value: '3' } });
    return { user, drawer };
  }

  it('switch a Orari specifici prefilla a passi di intervallo da 08:00 (6h, 3 dosi)', async () => {
    const { user, drawer } = await setupIntervallo();

    await user.click(within(drawer).getByLabelText('Orari specifici'));

    expect(within(within(drawer).getByTestId('orario-row-0')).getByLabelText('Orario')).toHaveValue('08:00');
    expect(within(within(drawer).getByTestId('orario-row-1')).getByLabelText('Orario')).toHaveValue('14:00');
    expect(within(within(drawer).getByTestId('orario-row-2')).getByLabelText('Orario')).toHaveValue('20:00');
  });

  it('ritorno ad Ai pasti ripristina i default colazione/offset 0', async () => {
    const { user, drawer } = await setupIntervallo();

    await user.click(within(drawer).getByLabelText('Orari specifici'));
    await user.click(within(drawer).getByLabelText('Ai pasti'));

    const row1 = within(drawer).getByTestId('orario-row-1');
    expect(within(row1).getByLabelText('Rispetto a')).toHaveValue('colazione');
    expect(within(row1).getByLabelText('Offset (min)')).toHaveValue(0);
  });
});

describe('FarmaciTab — P14 avviso dosi trascorse (par.22.198-ter)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('create con data_inizio oggi e preview nel passato mostra avviso non bloccante', () => {
    // Pattern s.6.243: pin ONLY the Date clock.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-15T22:00:00'));

    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    fireEvent.click(within(drawer).getByLabelText('Fisso'));

    // data_inizio default = domani: nessun avviso.
    expect(within(drawer).queryByTestId('farmaco-past-doses-warning')).not.toBeInTheDocument();

    // data_inizio = oggi; riga default colazione 07:30 < now 22:00.
    fireEvent.change(within(drawer).getByLabelText('Data inizio'), {
      target: { value: '2026-01-15' },
    });

    const warn = within(drawer).getByTestId('farmaco-past-doses-warning');
    expect(warn).toHaveTextContent(/gi\u00e0 trascors/);
    // Non bloccante: Salva e Annulla restano gli unici gate; nessun modal.
    expect(within(drawer).getByRole('button', { name: 'Salva' })).toBeInTheDocument();
  });
});

describe('FarmaciTab — B24 header sticky (par.22.198-ter)', () => {
  it('header lista Farmaci e\u0027 sticky con offset sotto la ConfigTabBar', () => {
    renderTab();
    const h2 = screen.getByText('Farmaci', { selector: 'h2' });
    const header = h2.closest('header');
    // Nota: niente asserzione su style.top — jsdom scarta calc(env(...)).
    expect(header.className).toMatch(/sticky/);
    expect(header.className).toMatch(/z-20/);
  });
});
