// ============================================================
// F14 BUG-h + BUG-g -- FarmaciTab create-flow render assertions.
// ============================================================
//
// BUG-h: "Tipo frequenza" is required (part of allRequiredFilled) but rendered
//        as <fieldset>/<legend>, not via FormField/FormSelect, so it lacked the
//        '*' required marker. Assert the marker now appears on the legend.
//
// BUG-g (R3 -- confirmed non-bug, regression guard): data_fine is nullable
//        end-to-end. With data_fine left empty, Salva must be ENABLED and
//        addFarmaco must receive data_fine === null (chronic therapy).
//
// Harness mirrors FarmaciTab.test.jsx (self-contained copies of buildFarmaci /
// buildProfiloAttivo: not exported there). data_inizio defaults to tomorrow
// (§6.178), valid, so allRequiredFilled is satisfied by the minimal fields.

import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import FarmaciTab from './FarmaciTab.jsx';

function buildFarmaci() {
  return [
    {
      id: 1, nome: 'Pantorc 40mg', principio_attivo: 'pantoprazolo',
      funzione: 'Gastroprotezione',
      tipo_frequenza: 'fisso', intervallo_ore: null, intervallo_minimo_ore: null,
      dosi_giornaliere: 1, relazione_pasto: 'prima', dettaglio_pasto: null, note: null,
      data_inizio: '2024-01-01', data_fine: null, attivo: 1,
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

async function openCreateDrawer(user) {
  await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
  const drawer = screen.getByTestId('farmaco-drawer');
  expect(drawer).toBeInTheDocument();
  return drawer;
}

describe('F14 BUG-h — marcatore richiesto su "Tipo frequenza"', () => {
  it('la legend "Tipo frequenza" mostra il marcatore obbligatorio *', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
    });

    const drawer = await openCreateDrawer(user);

    // getByText matches the legend by its direct text node ("Tipo frequenza");
    // the marker is a separate aria-hidden <span>, so it lives in textContent.
    const legend = within(drawer).getByText(/Tipo frequenza/);
    expect(legend.tagName).toBe('LEGEND');
    expect(legend.textContent).toMatch(/\*/);
  });
});

describe('F14 BUG-g — data_fine nullable (terapia cronica)', () => {
  it('con data_fine vuota: Salva abilitato e addFarmaco riceve data_fine null', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn().mockResolvedValue({ ok: true, id: 99 });
    const showToast = vi.fn();

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: { addFarmaco, showToast },
    });

    const drawer = await openCreateDrawer(user);

    // Minimal required fields (data_fine intentionally left empty).
    await user.type(within(drawer).getByLabelText(/^Nome/), 'Cronico');
    await user.click(within(drawer).getByLabelText('Fisso'));
    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    // BUG-g: Salva must be enabled even without data_fine.
    const salva = within(drawer).getByRole('button', { name: /^salva$/i });
    expect(salva).not.toBeDisabled();
    await user.click(salva);

    await waitFor(() => expect(addFarmaco).toHaveBeenCalledTimes(1));
    const [farmacoDataArg] = addFarmaco.mock.calls[0];
    expect(farmacoDataArg.data_fine).toBeNull();
  });
});
