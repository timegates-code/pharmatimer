// ============================================================
// FarmaciTab — CP2 + CP3 + CP4 tests (Sessione 8c).
// ============================================================
//
// CP2: 3 tests (render + sort + "+ Nuovo" presence).
// CP3: 3 tests (drawer open/close + Salva gate + tipo_frequenza toggle).
// CP4: 3 tests (dosi→orari sync: add / trim+undo / wrap-mezzanotte soft warning).
// ============================================================

import { describe, it, expect } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import FarmaciTab from './FarmaciTab.jsx';

function buildFarmaci() {
  // Intentionally out of alphabetical order to exercise sort (CP2 test 2).
  return [
    {
      id: 1, nome: 'Pantorc 40mg', principio_attivo: 'pantoprazolo',
      funzione: 'Gastroprotezione',
      tipo_frequenza: 'fisso', intervallo_ore: null, intervallo_minimo_ore: null,
      dosi_giornaliere: 1, relazione_pasto: 'prima', dettaglio_pasto: null, note: null,
      data_inizio: '2024-01-01', data_fine: null, attivo: 1,
    },
    {
      id: 2, nome: 'Ezevast 10mg', principio_attivo: 'ezetimibe',
      funzione: 'Colesterolo',
      tipo_frequenza: 'fisso', intervallo_ore: null, intervallo_minimo_ore: null,
      dosi_giornaliere: 1, relazione_pasto: 'dopo', dettaglio_pasto: null, note: null,
      data_inizio: '2024-01-01', data_fine: null, attivo: 1,
    },
    {
      id: 3, nome: 'Duoresp Spiromax', principio_attivo: 'budesonide/formoterolo',
      funzione: 'Broncodilatatore',
      tipo_frequenza: 'intervallo', intervallo_ore: 12, intervallo_minimo_ore: 6,
      dosi_giornaliere: 2, relazione_pasto: 'indifferente', dettaglio_pasto: null, note: null,
      data_inizio: '2025-01-01', data_fine: '2025-12-31', attivo: 1,
    },
  ];
}

function buildProfiloAttivo() {
  return {
    id: 1, nome_profilo: 'Standard',
    ora_sveglia: '07:00', ora_colazione: '07:30',
    ora_pranzo: '13:00', ora_cena: '20:30', ora_sonno: '23:30',
    attivo: 1,
  };
}

describe('FarmaciTab — CP2 lista read-only', () => {
  it('renderizza una card per farmaco con nome, funzione, meta e badge corretti', () => {
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    expect(screen.getByTestId('config-tab-farmaci')).toBeInTheDocument();
    expect(screen.getByTestId('farmaco-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('farmaco-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('farmaco-card-3')).toBeInTheDocument();

    const cardPantorc = screen.getByTestId('farmaco-card-1');
    expect(within(cardPantorc).getByText('Pantorc 40mg')).toBeInTheDocument();
    expect(within(cardPantorc).getByText('Gastroprotezione')).toBeInTheDocument();
    expect(within(cardPantorc).getByText('Cronico')).toBeInTheDocument();
    expect(within(cardPantorc).getByText(/1×\/die/)).toBeInTheDocument();

    const cardDuoresp = screen.getByTestId('farmaco-card-3');
    expect(within(cardDuoresp).getByText('Duoresp Spiromax')).toBeInTheDocument();
    expect(within(cardDuoresp).getByText('Temporaneo')).toBeInTheDocument();
    expect(within(cardDuoresp).getByText(/2×\/die/)).toBeInTheDocument();
    expect(within(cardDuoresp).getByText(/ogni 12h/)).toBeInTheDocument();
  });

  it('ordina alfabeticamente per nome con collation italiana', () => {
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    const cards = screen.getAllByTestId(/^farmaco-card-/);
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText('Duoresp Spiromax')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Ezevast 10mg')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Pantorc 40mg')).toBeInTheDocument();
  });

  it('bottone "+ Nuovo" presente in header (CP3: enabled per wiring drawer)', () => {
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    const btn = screen.getByRole('button', { name: /nuovo farmaco/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });
});

describe('FarmaciTab — CP3 drawer + form', () => {
  it('tap card apre drawer in edit-mode con campi popolati; X close chiude', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();

    const cardBtn = within(screen.getByTestId('farmaco-card-1')).getByRole('button');
    await user.click(cardBtn);
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pantorc 40mg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();
  });

  it('bottone Salva disabled all\u2019apertura del drawer in create mode', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();

    const salva = screen.getByRole('button', { name: /^salva$/i });
    expect(salva).toBeDisabled();
  });

  it('toggle tipo_frequenza fisso→intervallo mostra/nasconde input intervallo_ore', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));

    expect(screen.queryByLabelText('Intervallo (ore)')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('A intervallo'));
    expect(screen.getByLabelText('Intervallo (ore)')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Fisso'));
    expect(screen.queryByLabelText('Intervallo (ore)')).not.toBeInTheDocument();
  });
});

// ============================================================
// CP4 — sezione Orari auto-sync + undo + soft warning ordine.
// ============================================================

describe('FarmaciTab — CP4 sezione Orari', () => {
  it('cambio dosi_giornaliere 1→3 aggiunge 2 righe con defaults (ancora=colazione, offset=0)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: buildFarmaci(),
        profili: [buildProfiloAttivo()],
      },
    });
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));

    // Inizialmente 1 riga (default EMPTY_FORM.orari).
    expect(screen.getByTestId('orario-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('orario-row-1')).not.toBeInTheDocument();

    // Cambia dosi_giornaliere a 3.
    const dosi = screen.getByLabelText('Dosi giornaliere');
    fireEvent.change(dosi, { target: { value: '3' } });

    // Ora 3 righe, le nuove con defaults (select = 'colazione', offset = 0).
    expect(screen.getByTestId('orario-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-2')).toBeInTheDocument();

    const row2 = screen.getByTestId('orario-row-2');
    const ancoraSelect = within(row2).getByLabelText('Ancora');
    expect(ancoraSelect).toHaveValue('colazione');
    const offsetInput = within(row2).getByLabelText('Offset (min)');
    expect(offsetInput).toHaveValue(0);
  });

  it('cambio dosi_giornaliere 3→1 rimuove 2 righe con banner role="status" + undo ripristina', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: buildFarmaci(),
        profili: [buildProfiloAttivo()],
      },
    });
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));

    const dosi = screen.getByLabelText('Dosi giornaliere');
    // Porta a 3.
    fireEvent.change(dosi, { target: { value: '3' } });
    expect(screen.getByTestId('orario-row-2')).toBeInTheDocument();

    // Torna a 1 → banner + solo row-0 resta.
    fireEvent.change(dosi, { target: { value: '1' } });
    expect(screen.getByTestId('orario-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('orario-row-1')).not.toBeInTheDocument();
    expect(screen.getByText(/2 orari rimossi/i)).toBeInTheDocument();

    // Click Ripristina → ripristina 3 righe, banner scompare.
    await user.click(screen.getByRole('button', { name: /ripristina/i }));
    expect(screen.getByTestId('orario-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-2')).toBeInTheDocument();
    expect(screen.queryByText(/2 orari rimossi/i)).not.toBeInTheDocument();
  });

  it('soft warning ordine NON appare con wrap-mezzanotte singolo (wrap=1)', async () => {
    const user = userEvent.setup();
    // 3 orari producono ora_prevista [07:30, 20:30, 02:30] → 1 wrap ammesso.
    const farmacoWrap = {
      id: 99, nome: 'TestWrap', principio_attivo: 'x',
      funzione: 'f',
      tipo_frequenza: 'fisso', intervallo_ore: null, intervallo_minimo_ore: null,
      dosi_giornaliere: 3, relazione_pasto: 'indifferente', dettaglio_pasto: null, note: null,
      data_inizio: '2024-01-01', data_fine: null, attivo: 1,
    };
    const orari = [
      { id: 1, farmaco_id: 99, dose_numero: 1, offset_minuti: 0,   ancora_riferimento: 'colazione', descrizione_momento: null },
      { id: 2, farmaco_id: 99, dose_numero: 2, offset_minuti: 0,   ancora_riferimento: 'cena',      descrizione_momento: null },
      { id: 3, farmaco_id: 99, dose_numero: 3, offset_minuti: 180, ancora_riferimento: 'sonno',     descrizione_momento: null },
    ];
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: [farmacoWrap],
        orari,
        profili: [buildProfiloAttivo()],
      },
    });

    const cardBtn = within(screen.getByTestId('farmaco-card-99')).getByRole('button');
    await user.click(cardBtn);
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('orario-row-2')).toBeInTheDocument();

    // 1 wrap (cena→sonno+180min = 02:30 del giorno dopo) è ammesso.
    expect(screen.queryByText(/ordine orari anomalo/i)).not.toBeInTheDocument();
  });
});
