// ============================================================
// FarmaciTab — CP8 v3.0.0 Step 2 extended branch tests.
// ============================================================
//
// Additive test file (separate from FarmaciTab.test.jsx) covering the
// CP8 §6.183-185 layer:
//   T1: edit-load 168h farmaco renders form as 7d 0h; user changes
//       to 0d 12h; save invokes updateFarmaco with intervallo_ore=12.
//   T2: form switches into extended (giorni*24+ore_residue > 24);
//       dosi_giornaliere input becomes disabled with value '1'
//       (UI-only auto-lock; orari array left untouched until save).
//   T3: edit standard (intervallo 8h, dosi 2, 2 orari) → user pushes
//       intervallo to 1d 6h (= 30h, extended) → click Salva → cascade
//       ConfirmModal opens with copy mentioning trim → Conferma →
//       updateFarmaco called with dosi_giornaliere=1 and orari len=1.
//
// Pattern: `actions: { ... }` override on renderWithProvider (per
// renderHelpers.jsx 7d-1 + §6.94). `fireEvent.change` for number
// inputs (uniform with CP5 data_fine-past test pattern). Modal scope
// via `confirm-modal` testid; the 3 ConfirmModal mounted in
// FarmaciTab are mutually exclusive on `open=true`.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
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

describe('FarmaciTab — CP8 extended UI giorni+ore', () => {
  // ----------------------------------------------------------
  // T1 — edit-load split (168h → 7d 0h) + save (0d 12h → 12)
  // ----------------------------------------------------------

  it('(T1) edit farmaco intervallo_ore=168 → form mostra 7 giorni 0 ore; cambio a 0g 12h → updateFarmaco invocato con intervallo_ore=12', async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    const farmaco = {
      id: 99, nome: 'Metotrexato', principio_attivo: 'metotrexato',
      funzione: 'Antireumatico',
      tipo_frequenza: 'intervallo', intervallo_ore: 168, intervallo_minimo_ore: null,
      dosi_giornaliere: 1, relazione_pasto: 'durante', dettaglio_pasto: null, note: null,
      data_inizio: '2026-04-01', data_fine: null, attivo: 1,
    };
    const orario = {
      id: 991, farmaco_id: 99, dose_numero: 1,
      offset_minuti: 0, ancora_riferimento: 'colazione',
      descrizione_momento: null,
    };

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: [farmaco],
        orari: [orario],
        profili: [buildProfiloAttivo()],
      },
      actions: { updateFarmaco },
    });

    // Open drawer in edit mode.
    await user.click(
      within(screen.getByTestId('farmaco-card-99')).getByRole('button')
    );
    const drawer = screen.getByTestId('farmaco-drawer');
    expect(drawer).toBeInTheDocument();

    // Form pre-populated with split values: 7 days, 0 hours.
    const giorniInput = within(drawer).getByLabelText('Giorni');
    const oreInput = within(drawer).getByLabelText('Ore');
    expect(giorniInput).toHaveValue(7);
    expect(oreInput).toHaveValue(0);

    // Change to 0 days, 12 hours (no longer extended; standard 12h).
    fireEvent.change(giorniInput, { target: { value: '0' } });
    fireEvent.change(oreInput, { target: { value: '12' } });

    // Save.
    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));

    await waitFor(() => expect(updateFarmaco).toHaveBeenCalled());
    const [calledId, farmacoData] = updateFarmaco.mock.calls[0];
    expect(calledId).toBe(99);
    expect(farmacoData.intervallo_ore).toBe(12);
  });

  // ----------------------------------------------------------
  // T2 — extended boundary auto-locks dosi_giornaliere
  // ----------------------------------------------------------

  it('(T2) quando il totale supera 24h, dosi_giornaliere viene auto-impostata a 1 e disabilitata', async () => {
    const user = userEvent.setup();

    const farmaco = {
      id: 50, nome: 'Standard 8h', principio_attivo: null, funzione: null,
      tipo_frequenza: 'intervallo', intervallo_ore: 8, intervallo_minimo_ore: null,
      dosi_giornaliere: 3, relazione_pasto: 'indifferente',
      dettaglio_pasto: null, note: null,
      data_inizio: '2026-04-01', data_fine: null, attivo: 1,
    };
    const orari = [
      { id: 501, farmaco_id: 50, dose_numero: 1, offset_minuti: 0,   ancora_riferimento: 'colazione', descrizione_momento: null },
      { id: 502, farmaco_id: 50, dose_numero: 2, offset_minuti: 480, ancora_riferimento: 'colazione', descrizione_momento: null },
      { id: 503, farmaco_id: 50, dose_numero: 3, offset_minuti: 960, ancora_riferimento: 'colazione', descrizione_momento: null },
    ];

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: [farmaco],
        orari,
        profili: [buildProfiloAttivo()],
      },
    });

    await user.click(
      within(screen.getByTestId('farmaco-card-50')).getByRole('button')
    );
    const drawer = screen.getByTestId('farmaco-drawer');

    // Pre-condition: form loaded standard, dosi_giornaliere editable with value 3.
    const dosiInput = within(drawer).getByTestId('farmaco-dosi-giornaliere-input');
    expect(dosiInput).toHaveValue(3);
    expect(dosiInput).not.toBeDisabled();

    // Push intervallo into extended territory: 2 days, 0 hours = 48h.
    fireEvent.change(within(drawer).getByLabelText('Giorni'), { target: { value: '2' } });

    // dosi_giornaliere is now auto-locked to 1 and disabled.
    expect(dosiInput).toHaveValue(1);
    expect(dosiInput).toBeDisabled();
    expect(within(drawer).getByText('Fissata a 1 per intervalli oltre le 24 ore.')).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // T3 — cascade ConfirmModal trims orari extra at save-time
  // ----------------------------------------------------------

  it('(T3) standard dosi=2 → user porta intervallo a 1g 6h (extended) → Salva apre cascade ConfirmModal → Conferma chiama updateFarmaco con dosi=1 e orari length=1', async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    const farmaco = {
      id: 70, nome: 'Test cascade', principio_attivo: null, funzione: null,
      tipo_frequenza: 'intervallo', intervallo_ore: 8, intervallo_minimo_ore: null,
      dosi_giornaliere: 2, relazione_pasto: 'indifferente',
      dettaglio_pasto: null, note: null,
      data_inizio: '2026-04-01', data_fine: null, attivo: 1,
    };
    const orari = [
      { id: 701, farmaco_id: 70, dose_numero: 1, offset_minuti: 0,   ancora_riferimento: 'colazione', descrizione_momento: null },
      { id: 702, farmaco_id: 70, dose_numero: 2, offset_minuti: 480, ancora_riferimento: 'colazione', descrizione_momento: null },
    ];

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: [farmaco],
        orari,
        profili: [buildProfiloAttivo()],
      },
      actions: { updateFarmaco },
    });

    await user.click(
      within(screen.getByTestId('farmaco-card-70')).getByRole('button')
    );
    const drawer = screen.getByTestId('farmaco-drawer');

    // Push to 1 day 6 hours = 30h extended.
    fireEvent.change(within(drawer).getByLabelText('Giorni'), { target: { value: '1' } });
    fireEvent.change(within(drawer).getByLabelText('Ore'), { target: { value: '6' } });

    // Save → cascade ConfirmModal opens (updateFarmaco not yet called).
    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));
    expect(updateFarmaco).not.toHaveBeenCalled();

    // ConfirmModal scoped via testid (mutually exclusive open).
    const confirm = await screen.findByTestId('confirm-modal');
    expect(within(confirm).getByText('Intervallo oltre le 24 ore')).toBeInTheDocument();
    expect(within(confirm).getByText(/Verrà rimosso 1 orario aggiuntivo/i)).toBeInTheDocument();

    // Conferma: cascade closes, updateFarmaco called with trimmed payload.
    await user.click(within(confirm).getByRole('button', { name: /^conferma$/i }));

    await waitFor(() => expect(updateFarmaco).toHaveBeenCalled());
    const [calledId, farmacoData, orariPayload] = updateFarmaco.mock.calls[0];
    expect(calledId).toBe(70);
    expect(farmacoData.dosi_giornaliere).toBe(1);
    expect(farmacoData.intervallo_ore).toBe(30);
    expect(orariPayload).toHaveLength(1);
    expect(orariPayload[0].dose_numero).toBe(1);
  });
});
