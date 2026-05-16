// ============================================================
// FarmaciTab — CP2 + CP3 + CP4 + CP5 tests (Sessione 8c + 8c-2 + v3.0.0 Step 1).
// ============================================================
//
// CP2: 3 tests (render + sort + "+ Nuovo" presence).
// CP3: 3 tests (drawer open/close + Salva gate + tipo_frequenza toggle).
// CP4: 3 tests (dosi→orari sync: add / trim+undo / wrap-mezzanotte soft warning).
// CP5 (8c-2): 2 tests (delete flow §6.67 + data_fine-past flow §6.68)
//             + UnsavedChanges guard tests on close path (§6.98 / §6.103 / §6.105).
// CP5 (v3.0.0 Step 1): 1 test (§6.177 — Mit-C toast trigger post-aggiunta).
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
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

    expect(screen.queryByLabelText('Giorni')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('A intervallo'));
    expect(screen.getByLabelText('Giorni')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Fisso'));
    expect(screen.queryByLabelText('Giorni')).not.toBeInTheDocument();
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

// ============================================================
// CP5 — delete + data_fine-past flows (§6.67 + §6.68 + §6.89).
// ============================================================

describe('FarmaciTab — CP5 delete + data_fine-past', () => {
  it('(a) tap Elimina → ConfirmModal copy §6.67 → conferma → deleteFarmaco(id), drawer chiuso', async () => {
    const user = userEvent.setup();
    const deleteFarmaco = vi.fn().mockResolvedValue({ ok: true });

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
      actions: { deleteFarmaco },
    });

    // Apri drawer in edit mode su Pantorc (id=1).
    await user.click(
      within(screen.getByTestId('farmaco-card-1')).getByRole('button')
    );
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();

    // Tap "Elimina" nel footer del drawer. Scope the query to the drawer
    // to avoid clashing with the ConfirmModal's confirm button label.
    const drawer = screen.getByTestId('farmaco-drawer');
    await user.click(within(drawer).getByRole('button', { name: /^elimina$/i }));

    // ConfirmModal open con copy §6.67.
    const confirm = screen.getByTestId('confirm-modal');
    expect(within(confirm).getByText(/Pantorc 40mg/i)).toBeInTheDocument();
    expect(within(confirm).getByText(/log storico/i)).toBeInTheDocument();

    // Conferma: click sul bottone "Elimina" dentro il modal.
    await user.click(within(confirm).getByRole('button', { name: /^elimina$/i }));

    // Thunk invocato con id=1.
    expect(deleteFarmaco).toHaveBeenCalledTimes(1);
    expect(deleteFarmaco).toHaveBeenCalledWith(1);

    // Drawer chiuso (mock returned {ok:true}).
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();
  });

  it('(b) data_fine nel passato → Salva → ConfirmModal copy §6.68 → Conferma → updateFarmaco(id, patch, orari)', async () => {
    const user = userEvent.setup();
    const updateFarmaco = vi.fn().mockResolvedValue({ ok: true });

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: buildFarmaci(),
        profili: [buildProfiloAttivo()],
      },
      actions: { updateFarmaco },
    });

    // Apri drawer su Duoresp (id=3). Il fixture ha già data_fine='2025-12-31';
    // per triggerare isDirty modifichiamo a una data chiaramente nel passato.
    await user.click(
      within(screen.getByTestId('farmaco-card-3')).getByRole('button')
    );
    const drawer = screen.getByTestId('farmaco-drawer');
    expect(drawer).toBeInTheDocument();

    const dataFine = within(drawer).getByLabelText('Data fine');
    fireEvent.change(dataFine, { target: { value: '2020-01-01' } });

    // Tap Salva.
    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));

    // ConfirmModal open con copy §6.68.
    const confirm = screen.getByTestId('confirm-modal');
    expect(within(confirm).getByText(/2020-01-01/)).toBeInTheDocument();
    expect(within(confirm).getByText(/scompariranno/i)).toBeInTheDocument();
    expect(within(confirm).getByText(/log storici/i)).toBeInTheDocument();

    // Conferma.
    await user.click(within(confirm).getByRole('button', { name: /^conferma$/i }));

    // Thunk invocato con id=3, patch contenente data_fine, + orari (array).
    expect(updateFarmaco).toHaveBeenCalledTimes(1);
    const [idArg, patchArg, orariArg] = updateFarmaco.mock.calls[0];
    expect(idArg).toBe(3);
    expect(patchArg).toMatchObject({ data_fine: '2020-01-01' });
    expect(Array.isArray(orariArg)).toBe(true);

    // Drawer chiuso.
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();
  });

  // 8d-B CP2 regression guard (§6.105): tap Elimina drawer footer apre
  // ConfirmModal, Escape lo chiude, focus deve tornare al button
  // Elimina drawer footer. Pre-fix il focus cadeva su document.body.
  // Cross-consumer parity con ProfiliTab equivalente.
  it('(c) Escape su ConfirmModal delete restituisce focus al button Elimina drawer (§6.105)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
      actions: { deleteFarmaco: vi.fn().mockResolvedValue({ ok: true }) },
    });

    await user.click(
      within(screen.getByTestId('farmaco-card-1')).getByRole('button')
    );
    const drawer = screen.getByTestId('farmaco-drawer');
    const eliminaBtn = within(drawer).getByRole('button', { name: /^elimina$/i });

    await user.click(eliminaBtn);
    const confirm = screen.getByTestId('confirm-modal');
    await waitFor(() => expect(confirm.contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() => expect(document.activeElement).toBe(eliminaBtn));
  });
});

// ============================================================
// CP4 (Sessione 8d-A-continue) — UnsavedChangesModal guard
// on drawer close path (§6.98).
// ============================================================

describe('FarmaciTab — 8d-A-continue §6.98 UnsavedChanges guard su close', () => {
  it('guard scatta su Annulla con form dirty', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });

    // Open drawer in create mode.
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    expect(drawer).toBeInTheDocument();

    // Dirty the form: type into Nome field.
    const nomeInput = within(drawer).getByLabelText(/^Nome/);
    await user.type(nomeInput, 'Test');

    // Click Annulla in drawer footer (scope via within to avoid any
    // label clash with other Annulla buttons).
    await user.click(within(drawer).getByRole('button', { name: /^annulla$/i }));

    // UnsavedChangesModal appears. Use role=heading (level 3) to
    // disambiguate the h3 title from the body paragraph which also
    // contains the phrase "modifiche non salvate".
    expect(
      screen.getByRole('heading', { name: /modifiche non salvate/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /scarta e continua/i }),
    ).toBeInTheDocument();

    // Drawer still mounted (guard blocks close).
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();
  });

  it('Annulla con form clean chiude drawer senza guard', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });

    // Open drawer in create mode.
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    expect(drawer).toBeInTheDocument();

    // Click Annulla footer immediately — form is clean, isDirty=false.
    await user.click(within(drawer).getByRole('button', { name: /^annulla$/i }));

    // Drawer unmounted, no UnsavedChangesModal ever mounted.
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /modifiche non salvate/i }),
    ).not.toBeInTheDocument();
  });

  // 8d-B CP3 regression guard (§6.103): Escape su UnsavedChangesModal
  // chiude il modal via useModalA11y onDeactivate → onCancel callback.
  // Pre-retrofit il modal non aveva focus-trap né Escape-to-close.
  it('Escape su UnsavedChangesModal chiama onCancel (§6.103)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci() },
    });

    // Open drawer in create mode + dirty il form.
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    const nomeInput = within(drawer).getByLabelText(/^Nome/);
    await user.type(nomeInput, 'Test');

    // Tap Annulla → UnsavedChangesModal apre.
    await user.click(within(drawer).getByRole('button', { name: /^annulla$/i }));
    const modal = screen.getByTestId('unsaved-changes-modal');
    // Focus-trap ha portato focus dentro il modal.
    await waitFor(() => expect(modal.contains(document.activeElement)).toBe(true));

    // Escape → onCancel → modal chiuso, drawer ancora aperto (guard non scartato).
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument()
    );
    // Drawer ancora aperto: Escape annulla la chiusura, non la conferma.
    expect(screen.getByTestId('farmaco-drawer')).toBeInTheDocument();
  });

});

// ============================================================
// CP5 v3.0.0 Step 1 — Mit-C toast trigger post-aggiunta (§6.177, Q-UX.5).
// ============================================================

describe('FarmaciTab — CP5 v3.0.0 Step 1 Mit-C toast trigger (§6.177)', () => {
  it('commitSave su create-mode dispatcha actions.showToast con copy "✅ ... aggiunto. Prima dose: ..."', async () => {
    const user = userEvent.setup();
    const addFarmaco = vi.fn().mockResolvedValue({ ok: true, id: 99 });
    const showToast = vi.fn();

    renderWithProvider(<FarmaciTab />, {
      stateOverrides: {
        farmaci: buildFarmaci(),
        // Profilo richiesto perché orariPreview consuma profiloAttivo
        // (defensive derive: profili[0].attivo===1 → buildProfiloAttivo).
        profili: [buildProfiloAttivo()],
      },
      actions: { addFarmaco, showToast },
    });

    // Apri drawer "+ Nuovo".
    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');
    expect(drawer).toBeInTheDocument();

    // Compila i campi minimi richiesti per allRequiredFilled:
    //   nome (typed), tipo_frequenza (radio), relazione_pasto (select).
    //   data_inizio: già default tomorrowIso() (§6.178), valid (>= today).
    //   dosi_giornaliere: già default '1', orari[0] = makeDefaultOrario(1).
    await user.type(within(drawer).getByLabelText(/^Nome/), 'TestFarmaco');
    await user.click(within(drawer).getByLabelText('Fisso'));
    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    // Tap Salva (mode=create, isDirty=true, allRequiredFilled=true).
    await user.click(within(drawer).getByRole('button', { name: /^salva$/i }));

    // addFarmaco invocato con il nome digitato + orari[1].
    await waitFor(() => expect(addFarmaco).toHaveBeenCalledTimes(1));
    const [farmacoDataArg, orariArg] = addFarmaco.mock.calls[0];
    expect(farmacoDataArg).toMatchObject({ nome: 'TestFarmaco', tipo_frequenza: 'fisso' });
    expect(Array.isArray(orariArg)).toBe(true);
    expect(orariArg).toHaveLength(1);

    // Mit-C trigger: showToast invocato 1 volta con messaggio formato
    // "✅ TestFarmaco aggiunto. Prima dose: <ramo today/tomorrow/future>."
    // Default data_inizio è tomorrow → matcha "domani, ..." nel body.
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/^✅ TestFarmaco aggiunto\. Prima dose: domani, .* alle \d{2}:\d{2}\.$/)
    );

    // Drawer chiuso post-success.
    expect(screen.queryByTestId('farmaco-drawer')).not.toBeInTheDocument();
  });
});

// CP1 Sessione 14 par.6.208 — UX-N8 asterisco Nome required + hint footer.
describe('FarmaciTab — CP1 Sessione 14 par.6.208 UX-N8 asterisco Nome + hint footer', () => {
  it('label Nome rende asterisco aria-hidden e input ha aria-required="true"', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: {},
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Input semantically marked required (a11y).
    const nomeInput = within(drawer).getByLabelText(/^Nome/);
    expect(nomeInput).toHaveAttribute('aria-required', 'true');

    // Visual asterisk inside the label, aria-hidden so screen readers
    // don't announce it twice with aria-required.
    const nomeLabel = drawer.querySelector('label[for="farmaco-nome"]');
    expect(nomeLabel).not.toBeNull();
    const star = nomeLabel.querySelector('span[aria-hidden="true"]');
    expect(star).not.toBeNull();
    expect(star).toHaveTextContent('*');
  });

  it('hint "Compila i campi obbligatori" visibile in create-mode con form vuoto', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: {},
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Form is fresh: Nome empty, tipo_frequenza empty, relazione_pasto empty
    // -> !allRequiredFilled -> hint visible.
    expect(within(drawer).getByText(/^Compila i campi obbligatori/)).toBeInTheDocument();
  });

  it('hint sparisce dopo aver compilato tutti i required (Nome + tipo_frequenza + relazione_pasto)', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: {},
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Pre-condition: hint visible (form fresh).
    expect(within(drawer).getByText(/^Compila i campi obbligatori/)).toBeInTheDocument();

    // Fill all required: Nome + radio Fisso + select Relazione_pasto.
    // data_inizio already default tomorrowIso(), dosi_giornaliere default '1'.
    await user.type(within(drawer).getByLabelText(/^Nome/), 'X');
    await user.click(within(drawer).getByLabelText('Fisso'));
    fireEvent.change(within(drawer).getByLabelText(/^Relazione/), {
      target: { value: 'indifferente' },
    });

    // Post-condition: allRequiredFilled=true -> hint hidden.
    await waitFor(() => {
      expect(within(drawer).queryByText(/^Compila i campi obbligatori/)).not.toBeInTheDocument();
    });
  });
});

// CP2 Sessione 14 par.6.209 — UX-N15 asterisco Relazione_pasto required.
describe('FarmaciTab — CP2 Sessione 14 par.6.209 UX-N15 asterisco Relazione_pasto', () => {
  it('label Relazione con il pasto rende asterisco aria-hidden e select ha aria-required="true"', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: {},
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Select semantically marked required (a11y).
    const relazioneSelect = within(drawer).getByLabelText(/^Relazione/);
    expect(relazioneSelect).toHaveAttribute('aria-required', 'true');

    // Visual asterisk inside the label, aria-hidden so screen readers
    // do not announce it twice with aria-required.
    const relazioneLabel = drawer.querySelector('label[for="farmaco-relazione-pasto"]');
    expect(relazioneLabel).not.toBeNull();
    const star = relazioneLabel.querySelector('span[aria-hidden="true"]');
    expect(star).not.toBeNull();
    expect(star).toHaveTextContent('*');
  });
});

// CP2-iter Sessione 14 par.6.211 — sub-AMB 14.D hint footer asterisco rosso.
describe('FarmaciTab — CP2-iter Sessione 14 par.6.211 hint footer asterisco', () => {
  it('hint footer rende asterisco rosso aria-hidden alla fine della stringa', async () => {
    const user = userEvent.setup();
    renderWithProvider(<FarmaciTab />, {
      stateOverrides: { farmaci: buildFarmaci(), profili: [buildProfiloAttivo()] },
      actions: {},
    });

    await user.click(screen.getByRole('button', { name: /nuovo farmaco/i }));
    const drawer = screen.getByTestId('farmaco-drawer');

    // Hint paragraph: role=status, contiene asterisco aria-hidden in span red.
    const hint = within(drawer).getByRole('status');
    expect(hint).toHaveTextContent(/^Compila i campi obbligatori/);

    const star = hint.querySelector('span[aria-hidden="true"]');
    expect(star).not.toBeNull();
    expect(star).toHaveTextContent('*');
  });
});
