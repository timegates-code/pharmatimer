// ============================================================
// ProfiliTab — tests (CP1 + CP2 Sessione 8b).
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import ProfiliTab from './ProfiliTab.jsx';

function buildProfili() {
  return [
    {
      id: 1,
      nome_profilo: 'Standard',
      ora_sveglia: '07:00',
      ora_colazione: '07:30',
      ora_pranzo: '13:00',
      ora_cena: '20:30',
      ora_sonno: '23:30',
      attivo: 1,
    },
    {
      id: 2,
      nome_profilo: 'Nottambulo',
      ora_sveglia: '10:00',
      ora_colazione: '10:30',
      ora_pranzo: '14:30',
      ora_cena: '21:30',
      ora_sonno: '02:00',
      attivo: 0,
    },
  ];
}

describe('ProfiliTab — CP1 lista read-only', () => {
  it('renderizza una card per profilo con nome e orari preview', () => {
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    expect(screen.getByTestId('config-tab-profili')).toBeInTheDocument();
    expect(screen.getByTestId('profilo-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('profilo-card-2')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Nottambulo')).toBeInTheDocument();

    const cardStandard = screen.getByTestId('profilo-card-1');
    expect(within(cardStandard).getByText('07:30')).toBeInTheDocument();
    expect(within(cardStandard).getByText('13:00')).toBeInTheDocument();
    expect(within(cardStandard).getByText('20:30')).toBeInTheDocument();
  });

  it('badge "Attivo" visibile solo sulla card del profilo con attivo===1', () => {
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    const cardStandard = screen.getByTestId('profilo-card-1');
    const cardNottambulo = screen.getByTestId('profilo-card-2');
    expect(within(cardStandard).getByText('Attivo')).toBeInTheDocument();
    expect(within(cardNottambulo).queryByText('Attivo')).not.toBeInTheDocument();
  });

  it('bottone "+ Nuovo" presente in header e accessibile via role button', () => {
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    expect(screen.getByRole('button', { name: /nuovo/i })).toBeInTheDocument();
  });
});

// ============================================================
// CP2 — drawer edit/create + form 6 campi + warning ordine.
// ============================================================

describe('ProfiliTab — CP2 drawer form', () => {
  it('click su card apre drawer in edit-mode con campi popolati', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    await user.click(within(screen.getByTestId('profilo-card-1')).getByRole('button'));
    const drawer = await screen.findByTestId('profilo-drawer');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText(/modifica profilo/i)).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Nome profilo')).toHaveValue('Standard');
    expect(within(drawer).getByLabelText('Sveglia')).toHaveValue('07:00');
    expect(within(drawer).getByLabelText('Colazione')).toHaveValue('07:30');
    expect(within(drawer).getByLabelText('Pranzo')).toHaveValue('13:00');
    expect(within(drawer).getByLabelText('Cena')).toHaveValue('20:30');
    expect(within(drawer).getByLabelText('Sonno')).toHaveValue('23:30');
  });

  it('click su "+ Nuovo" apre drawer in create-mode con campi vuoti', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    await user.click(screen.getByRole('button', { name: /nuovo/i }));
    const drawer = await screen.findByTestId('profilo-drawer');
    expect(within(drawer).getByText(/nuovo profilo/i)).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Nome profilo')).toHaveValue('');
    expect(within(drawer).getByLabelText('Sveglia')).toHaveValue('');
    expect(within(drawer).getByLabelText('Cena')).toHaveValue('');
    // Il bottone Salva esiste ma è disabled perché form vuoto + !dirty.
    expect(within(drawer).getByRole('button', { name: 'Salva' })).toBeDisabled();
  });

  it('warning inline compare se pranzo <= colazione (ordine violato)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
    });
    await user.click(within(screen.getByTestId('profilo-card-1')).getByRole('button'));
    const drawer = await screen.findByTestId('profilo-drawer');
    // Stato iniziale: nessun warning.
    expect(
      within(drawer).queryByText(/dopo la colazione/i)
    ).not.toBeInTheDocument();
    // Imposta pranzo < colazione → violazione.
    const pranzo = within(drawer).getByLabelText('Pranzo');
    await user.clear(pranzo);
    await user.type(pranzo, '06:00');
    expect(
      within(drawer).getByText(/dopo la colazione/i)
    ).toBeInTheDocument();
  });
});

// ============================================================
// CP4 — delete confirm modal render + wire thunk.
// ============================================================

describe('ProfiliTab — CP4 elimina profilo (non-attivo)', () => {
  it('click su Elimina apre ConfirmModal shared e conferma chiama actions.deleteProfilo', async () => {
    const user = userEvent.setup();
    const deleteProfilo = vi.fn().mockResolvedValue({ ok: true });
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
      actions: { deleteProfilo },
    });
    await user.click(within(screen.getByTestId('profilo-card-2')).getByRole('button'));
    const drawer = await screen.findByTestId('profilo-drawer');

    // §6.89 retrofit (8d-A-continue CP5): testid è ora 'confirm-modal'
    // (shared component in ../shared/ConfirmModal.jsx), non più
    // 'confirm-delete-profilo' (inline predecessor removed).
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Elimina' }));
    const confirm = await screen.findByTestId('confirm-modal');
    expect(within(confirm).getByText(/elimina profilo\?/i)).toBeInTheDocument();
    expect(within(confirm).getByText('Nottambulo')).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Elimina profilo' }));
    expect(deleteProfilo).toHaveBeenCalledTimes(1);
    expect(deleteProfilo).toHaveBeenCalledWith(2);
  });

  // 8d-B CP2 regression guard (§6.105): tap Elimina apre ConfirmModal,
  // Escape lo chiude, focus deve tornare al button Elimina che lo ha
  // originato. Pre-fix il focus cadeva su document.body perché
  // ConfirmModal non riceveva triggerRef.
  it('Escape su ConfirmModal restituisce il focus al button Elimina (§6.105)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProfiliTab />, {
      stateOverrides: { profili: buildProfili() },
      actions: { deleteProfilo: vi.fn().mockResolvedValue({ ok: true }) },
    });

    await user.click(within(screen.getByTestId('profilo-card-2')).getByRole('button'));
    const drawer = await screen.findByTestId('profilo-drawer');
    const eliminaBtn = within(drawer).getByRole('button', { name: 'Elimina' });

    await user.click(eliminaBtn);
    const confirm = await screen.findByTestId('confirm-modal');
    // Sanity: focus-trap ha portato focus dentro il modal.
    await waitFor(() => expect(confirm.contains(document.activeElement)).toBe(true));

    // Escape → onCancel via useModalA11y → restore focus a triggerRef.
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() => expect(document.activeElement).toBe(eliminaBtn));
  });
});
