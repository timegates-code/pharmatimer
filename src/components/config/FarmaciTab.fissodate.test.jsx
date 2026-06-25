// ============================================================
// FarmaciTab — F14 Blocco 2 fisso_date branch tests (par.22.154).
// ============================================================
//
// Additive test file (separate from FarmaciTab.test.jsx) covering the
// "Date specifiche" branch (Spec v1.16, lista piatta (data,ora)):
//   T1: create flow — radio "Date specifiche" seeds one occorrenza row;
//       user fills 3 occorrenze (dateA 08:00, dateA 20:00, dateB 09:00);
//       Salva → addFarmaco called with tipo_frequenza='fisso_date',
//       derived data_inizio=min / data_fine=max / dosi_giornaliere=max(k_D),
//       and a flat-list orari payload with data_specifica + ancora
//       'assoluto' + per-date dose_numero 1..k_D.
//   T2: edit-load — farmaco fisso_date with datata orari rows is
//       reconstructed into occorrenze rows (offset → HH:MM, sorted);
//       standard sections (dosi input, "Orari di assunzione") are hidden.
//   T3: validation — duplicate (data, ora) disables Salva + shows the
//       duplicate warning (no addFarmaco).
//   T4: validation — a past date in create disables Salva + shows the
//       past-date warning.
//
// Harness mirrors FarmaciTab.f14 / .extended tests: self-contained
// buildProfiloAttivo, renderWithProvider with actions override, future
// dates computed relative to today so the suite stays deterministic.
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

// ISO date for today + N days (deterministic relative to run time).
function isoOffset(days) {
  const d = new Date(Date.now() + days * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function openCreateDrawer(user) {
  await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
  const drawer = screen.getByTestId('farmaco-drawer');
  expect(drawer).toBeInTheDocument();
  return drawer;
}

function setOccorrenza(drawer, index, data, ora) {
  const row = within(drawer).getByTestId(`occorrenza-row-${index}`);
  if (data != null) {
    fireEvent.change(within(row).getByLabelText('Data'), { target: { value: data } });
  }
  if (ora != null) {
    fireEvent.change(within(row).getByLabelText('Orario'), { target: { value: ora } });
  }
}

describe('FarmaciTab — F14 Blocco 2 fisso_date (create)', () => {
  it('(T1) "Date specifiche": 3 occorrenze → addFarmaco con payload lista piatta derivato', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn().mockResolvedValue({ ok: true, id: 99 });
    const showToast = vi.fn();

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: [], profili: [buildProfiloAttivo()] },
      actions: { addFarmaco, showToast },
    });

    const drawer = await openCreateDrawer(user);

    await user.type(within(drawer).getByLabelText(/^Nome/), 'Antibiotico');
    await user.click(within(drawer).getByLabelText('Date specifiche'));

    const dateA = isoOffset(10);
    const dateB = isoOffset(11);

    // Seed row 0 already present after selecting the radio.
    setOccorrenza(drawer, 0, dateA, '08:00');
    // Add two more rows.
    await user.click(within(drawer).getByRole('button', { name: /aggiungi data/i }));
    setOccorrenza(drawer, 1, dateA, '20:00');
    await user.click(within(drawer).getByRole('button', { name: /aggiungi data/i }));
    setOccorrenza(drawer, 2, dateB, '09:00');

    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    const salva = within(drawer).getByRole('button', { name: /^salva$/i });
    expect(salva).not.toBeDisabled();
    await user.click(salva);

    await waitFor(() => expect(addFarmaco).toHaveBeenCalledTimes(1));
    const [farmacoData, orari] = addFarmaco.mock.calls[0];

    expect(farmacoData.tipo_frequenza).toBe('fisso_date');
    expect(farmacoData.intervallo_ore).toBeNull();
    expect(farmacoData.intervallo_minimo_ore).toBeNull();
    expect(farmacoData.data_inizio).toBe(dateA);
    expect(farmacoData.data_fine).toBe(dateB);
    expect(farmacoData.dosi_giornaliere).toBe(2); // max(k_D): dateA ha 2 dosi

    // Flat list ordered (data, ora) with per-date dose_numero 1..k_D.
    expect(orari.map((o) => [o.data_specifica, o.ora_prevista, o.dose_numero])).toEqual([
      [dateA, '08:00', 1],
      [dateA, '20:00', 2],
      [dateB, '09:00', 1],
    ]);
    expect(orari.every((o) => o.ancora_riferimento === 'assoluto')).toBe(true);
  });
});

describe('FarmaciTab — F14 Blocco 2 fisso_date (edit reconstruction)', () => {
  it('(T2) edit di un farmaco fisso_date ricostruisce le occorrenze e nasconde le sezioni standard', async () => {
    const user = userEvent.setup();

    const dateA = '2027-07-05';
    const dateB = '2027-07-06';
    const farmaco = {
      id: 77, nome: 'Ciclo specifico', principio_attivo: null, funzione: null,
      tipo_frequenza: 'fisso_date', intervallo_ore: null, intervallo_minimo_ore: null,
      dosi_giornaliere: 2, relazione_pasto: 'indifferente',
      dettaglio_pasto: null, note: null,
      data_inizio: dateA, data_fine: dateB, attivo: 1,
    };
    // Datata orari rows in non-sorted order; offset → HH:MM.
    const orari = [
      { id: 771, farmaco_id: 77, dose_numero: 2, offset_minuti: 1200, ancora_riferimento: 'assoluto', descrizione_momento: null, data_specifica: dateA },
      { id: 772, farmaco_id: 77, dose_numero: 1, offset_minuti: 480,  ancora_riferimento: 'assoluto', descrizione_momento: null, data_specifica: dateA },
      { id: 773, farmaco_id: 77, dose_numero: 1, offset_minuti: 540,  ancora_riferimento: 'assoluto', descrizione_momento: null, data_specifica: dateB },
    ];

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: [farmaco], orari, profili: [buildProfiloAttivo()] },
    });

    await user.click(within(screen.getByTestId('farmaco-card-77')).getByRole('button'));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Occorrenze reconstructed and sorted (data, ora).
    const row0 = within(drawer).getByTestId('occorrenza-row-0');
    expect(within(row0).getByLabelText('Data')).toHaveValue(dateA);
    expect(within(row0).getByLabelText('Orario')).toHaveValue('08:00');

    const row2 = within(drawer).getByTestId('occorrenza-row-2');
    expect(within(row2).getByLabelText('Data')).toHaveValue(dateB);
    expect(within(row2).getByLabelText('Orario')).toHaveValue('09:00');

    // Standard sections hidden in the fisso_date branch.
    expect(within(drawer).queryByTestId('farmaco-dosi-giornaliere-input')).toBeNull();
    expect(within(drawer).queryByText('Orari di assunzione')).toBeNull();
    expect(within(drawer).getByText('Date e orari')).toBeInTheDocument();
  });
});

describe('FarmaciTab — F14 Blocco 2 fisso_date (validazione)', () => {
  it('(T3) (data, ora) duplicati: Salva disabilitato + warning duplicati', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn();

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: [], profili: [buildProfiloAttivo()] },
      actions: { addFarmaco },
    });

    const drawer = await openCreateDrawer(user);
    await user.type(within(drawer).getByLabelText(/^Nome/), 'Dup');
    await user.click(within(drawer).getByLabelText('Date specifiche'));
    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    const dateA = isoOffset(10);
    setOccorrenza(drawer, 0, dateA, '08:00');
    await user.click(within(drawer).getByRole('button', { name: /aggiungi data/i }));
    setOccorrenza(drawer, 1, dateA, '08:00'); // duplicato esatto

    expect(within(drawer).getByText(/Data e orario duplicati/i)).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /^salva$/i })).toBeDisabled();
    expect(addFarmaco).not.toHaveBeenCalled();
  });

  it('(T4) data nel passato in creazione: Salva disabilitato + warning passato', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn();

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: [], profili: [buildProfiloAttivo()] },
      actions: { addFarmaco },
    });

    const drawer = await openCreateDrawer(user);
    await user.type(within(drawer).getByLabelText(/^Nome/), 'Passato');
    await user.click(within(drawer).getByLabelText('Date specifiche'));
    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    setOccorrenza(drawer, 0, isoOffset(-1), '08:00'); // ieri

    expect(within(drawer).getByText(/Le date non possono essere nel passato/i)).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /^salva$/i })).toBeDisabled();
    expect(addFarmaco).not.toHaveBeenCalled();
  });
});
