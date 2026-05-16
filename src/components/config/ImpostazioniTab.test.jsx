// ============================================================
// ImpostazioniTab — tests (CP4 Sessione 8a / AMB-8a.C + §6.77).
// ============================================================
//
// Scope CP4: 4 test sezione Nome
//   1. Render valore iniziale letto da state.impostazioni.nome_utente
//   2. Input vuoto (trim) → Salva disabilitato + hint inline
//   3. Edit + click Salva → actions.setSetting('nome_utente', trimmed)
//   4. [regression §6.77] Source of truth è impostazioni.nome_utente,
//      NON un eventuale legacy state.nomeUtente
//
// Scope CP5 Sessione 9-B parte 3/3 (AMB-9.F'): +4 test sezione Notifiche
//   10. !isStandalone → banner installa, no toggle
//   11. standalone+default+enabled=false → toggle off, click → requestEnable
//   12. standalone+granted+enabled=true → toggle on, click → disable
//   13. standalone+denied → banner permesso negato + toggle disabilitato
//
// Scope CP6 v3.0.0 Step 1 (§6.180): +2 test sezione Dati
//   14. Click "Ricomincia da capo" → ConfirmModal apre con copy danger
//   15. Click "Cancella tutto" nel modale → actions.resetAllData chiamato
//
// Pattern: renderWithProvider stub context con `stateOverrides` e
// `actions` spy. Niente MemoryRouter (sezione non usa routing
// interno). useNotifications hook is mocked at module level (CP5):
// the default mock returns a safe "neutral" state that does not
// affect the 9 pre-existing tests; CP5 tests override per-case.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import ImpostazioniTab from './ImpostazioniTab.jsx';
import { useNotifications } from '../../hooks/useNotifications.js';

// ============================================================
// Module-level mock for useNotifications (CP5).
// ============================================================
//
// The hook is mocked at module load so that pre-existing Nome/Tema/
// Avanzate tests (which never override this mock) get the safe default
// below. CP5 SezioneNotifiche tests override per-case via
// vi.mocked(useNotifications).mockReturnValue({...}) inside the test
// body. beforeEach resets the default to keep tests order-independent.
vi.mock('../../hooks/useNotifications.js', () => ({
  useNotifications: vi.fn(),
}));

const DEFAULT_NOTIFICATIONS_MOCK = {
  isStandalone: true,
  permission: 'granted',
  enabled: false,
  requestEnable: () => Promise.resolve(),
  disable: () => Promise.resolve(),
};

beforeEach(() => {
  vi.mocked(useNotifications).mockReturnValue(DEFAULT_NOTIFICATIONS_MOCK);
});

describe('ImpostazioniTab — Sezione Nome (CP4)', () => {
  it('renderizza il valore iniziale da state.impostazioni.nome_utente', () => {
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { nome_utente: 'Mario' } },
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('Mario');
  });

  it('input vuoto (trim) disabilita Salva e mostra hint inline', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { nome_utente: 'Mario' } },
    });
    const input = screen.getByLabelText('Nome');
    // Clear triggers onChange → dirty=true, value=''.
    await user.clear(input);
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/non può essere vuoto/i);
  });

  it('edit + click Salva dispatcha setSetting("nome_utente", trimmed)', async () => {
    const user = userEvent.setup();
    const setSetting = vi.fn().mockResolvedValue({ ok: true });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { nome_utente: 'Mario' } },
      actions: { setSetting },
    });
    const input = screen.getByLabelText('Nome');
    await user.clear(input);
    await user.type(input, '  Giulia  ');
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    expect(setSetting).toHaveBeenCalledWith('nome_utente', 'Giulia');
    expect(setSetting).toHaveBeenCalledTimes(1);
  });

  it('§6.77 regression: legge da impostazioni.nome_utente, ignora legacy state.nomeUtente', () => {
    // Post-cleanup §6.77 state.nomeUtente non esiste più. Anche se un caller
    // lo aggiungesse allo state per errore, la tab deve leggere solo da
    // impostazioni.nome_utente via selectImpostazione — mai dal mirror.
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: {
        impostazioni: { nome_utente: 'FromImpostazioni' },
        nomeUtente: 'LegacyIgnored',
      },
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('FromImpostazioni');
    expect(screen.queryByDisplayValue('LegacyIgnored')).not.toBeInTheDocument();
  });
});

// ============================================================
// Sezione Tema (CP5 / AMB-8a.C)
// ============================================================

describe('ImpostazioniTab — Sezione Tema (CP5)', () => {
  it('renderizza 3 radio e la selezione riflette state.impostazioni.tema', () => {
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { tema: 'dark' } },
    });
    expect(screen.getByRole('radio', { name: /automatico/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /chiaro/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /scuro/i })).toBeChecked();
  });

  it('click su "Scuro" dispatcha setSetting("tema", "dark")', async () => {
    const user = userEvent.setup();
    const setSetting = vi.fn().mockResolvedValue({ ok: true });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { tema: 'auto' } },
      actions: { setSetting },
    });
    await user.click(screen.getByRole('radio', { name: /scuro/i }));
    expect(setSetting).toHaveBeenCalledWith('tema', 'dark');
    expect(setSetting).toHaveBeenCalledTimes(1);
  });

  it('default (tema undefined in state) → radio "Automatico" selezionato', () => {
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    expect(screen.getByRole('radio', { name: /automatico/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /chiaro/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /scuro/i })).not.toBeChecked();
  });
});

// ============================================================
// Sezione Avanzate-DEV (CP6 / AMB-8a.D)
// ============================================================
//
// Strategy: vi.stubEnv('DEV', true|false) flips import.meta.env.DEV at
// runtime for the duration of each test; vi.unstubAllEnvs() in afterEach
// prevents leakage across tests. Field-level assertions use getByText
// on Italian labels (robust to DOM structure changes within <dl>).

describe('ImpostazioniTab — Sezione Avanzate-DEV (CP6)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('in DEV renderizza la sezione con i 4 campi read-only', () => {
    vi.stubEnv('DEV', true);
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: {
        impostazioni: { seed_loaded: 1 },
        simulatedNow: '15:30',
      },
    });
    expect(screen.getByTestId('sezione-avanzate')).toBeInTheDocument();
    expect(screen.getByText(/schema DB/i)).toBeInTheDocument();
    expect(screen.getByText(/ora simulata/i)).toBeInTheDocument();
    expect(screen.getByText(/seed caricato/i)).toBeInTheDocument();
    // CP5 9-B parte 3/3 / Q-CP5.3: 4° campo Notifiche pendenti.
    expect(screen.getByText(/notifiche pendenti/i)).toBeInTheDocument();
  });

  it('in PROD la sezione Avanzate non è renderizzata', () => {
    vi.stubEnv('DEV', false);
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    expect(screen.queryByTestId('sezione-avanzate')).not.toBeInTheDocument();
  });
});

// ============================================================
// Sezione Notifiche (CP5 Sessione 9-B parte 3/3 / AMB-9.F')
// ============================================================
//
// 4 test sul decision tree UI 4 stati, mocking useNotifications hook
// (l'integrazione hook ↔ services.notifications è già coperta da
// useNotifications.test.jsx, 6 test verdi in parte 1/2). Strategia
// mock-collaborator: testiamo la UI di SezioneNotifiche, non il decision
// tree dell'hook.

describe('ImpostazioniTab — Sezione Notifiche (CP5 9-B)', () => {
  it('!isStandalone → banner "Installa" + nessun toggle', () => {
    vi.mocked(useNotifications).mockReturnValue({
      ...DEFAULT_NOTIFICATIONS_MOCK,
      isStandalone: false,
      permission: 'default',
      enabled: false,
    });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    expect(screen.getByText(/installa pharmatimer sulla schermata home/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('standalone + default + enabled=false → toggle off, click invoca requestEnable', async () => {
    const user = userEvent.setup();
    const requestEnable = vi.fn().mockResolvedValue();
    const disable = vi.fn().mockResolvedValue();
    vi.mocked(useNotifications).mockReturnValue({
      isStandalone: true,
      permission: 'default',
      enabled: false,
      requestEnable,
      disable,
    });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    const toggle = screen.getByRole('switch', { name: /notifiche dosi/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).not.toBeDisabled();
    expect(screen.getByText(/verrà chiesto il permesso di sistema/i)).toBeInTheDocument();
    await user.click(toggle);
    expect(requestEnable).toHaveBeenCalledTimes(1);
    expect(disable).not.toHaveBeenCalled();
  });

  it('standalone + granted + enabled=true → toggle on, click invoca disable', async () => {
    const user = userEvent.setup();
    const requestEnable = vi.fn().mockResolvedValue();
    const disable = vi.fn().mockResolvedValue();
    vi.mocked(useNotifications).mockReturnValue({
      isStandalone: true,
      permission: 'granted',
      enabled: true,
      requestEnable,
      disable,
    });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: { notifiche_attive: 1 } },
    });
    const toggle = screen.getByRole('switch', { name: /notifiche dosi/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).not.toBeDisabled();
    expect(screen.getByText(/avviso poco prima di ogni dose/i)).toBeInTheDocument();
    await user.click(toggle);
    expect(disable).toHaveBeenCalledTimes(1);
    expect(requestEnable).not.toHaveBeenCalled();
  });

  it('standalone + denied → toggle disabilitato + banner permesso negato', () => {
    vi.mocked(useNotifications).mockReturnValue({
      ...DEFAULT_NOTIFICATIONS_MOCK,
      isStandalone: true,
      permission: 'denied',
      enabled: false,
    });
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    const toggle = screen.getByRole('switch', { name: /notifiche dosi/i });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/permesso negato/i)).toBeInTheDocument();
    expect(screen.getByText(/impostazioni di sistema/i)).toBeInTheDocument();
  });
});

// ============================================================
// Sezione Dati — "Ricomincia da capo" reset (CP6 v3.0.0 Step 1, §6.180)
// ============================================================
//
// 2 test sulla UI flow del reset:
//   - (a) tap sul bottone apre ConfirmModal con copy danger §6.180.
//   - (b) tap "Cancella tutto" nel modale invoca actions.resetAllData
//         esattamente 1 volta.
//
// Il thunk `resetAllData` interno (db.transaction + addProfilo Standard
// + init re-fetch) NON è oggetto di test in questo file: la transazione
// vive sotto repo abstraction, e il test integration end-to-end
// (browser CP) la copre. Qui mockiamo `resetAllData` come spy e
// validiamo solo il wiring UI ↔ thunk.

describe('ImpostazioniTab — Sezione Dati "Ricomincia da capo" (CP6 §6.180)', () => {
  it('tap "Ricomincia da capo" apre ConfirmModal con copy danger', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });

    // Bottone presente in PROD-visibile (non gated DEV come SezioneAvanzate).
    const resetBtn = screen.getByRole('button', { name: /ricomincia da capo/i });
    expect(resetBtn).toBeInTheDocument();

    // Modale assente prima del click.
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    await user.click(resetBtn);

    // ConfirmModal aperto con copy §6.180.
    const confirm = screen.getByTestId('confirm-modal');
    expect(within(confirm).getByRole('heading', { name: /ricomincia da capo/i })).toBeInTheDocument();
    expect(within(confirm).getByText(/tutti i tuoi dati saranno cancellati/i)).toBeInTheDocument();
    expect(within(confirm).getByText(/non può essere annullata/i)).toBeInTheDocument();
    expect(within(confirm).getByRole('button', { name: /^cancella tutto$/i })).toBeInTheDocument();
    expect(within(confirm).getByRole('button', { name: /^annulla$/i })).toBeInTheDocument();
  });

  it('tap "Cancella tutto" nel modale invoca actions.resetAllData esattamente 1 volta', async () => {
    const user = userEvent.setup();
    const resetAllData = vi.fn().mockResolvedValue({ ok: true });

    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
      actions: { resetAllData },
    });

    // Apri ConfirmModal.
    await user.click(screen.getByRole('button', { name: /ricomincia da capo/i }));
    const confirm = screen.getByTestId('confirm-modal');

    // Tap conferma.
    await user.click(within(confirm).getByRole('button', { name: /^cancella tutto$/i }));

    // Thunk invocato esattamente 1 volta, senza argomenti.
    expect(resetAllData).toHaveBeenCalledTimes(1);
    expect(resetAllData).toHaveBeenCalledWith();
  });
});


// =====================================================================
// CP2-bis Sessione 15 s.6.213 - Sezione Info single-affordance Guida
// =====================================================================
//
// Defensive test for the single-affordance ratification: SezioneInfo
// must no longer contain a Guida link (redundant residual link removed
// by patcher CP2-a). SezioneAiuto remains the PROD-ratified consumer
// for the guide HTML (cf. §6.192 + §22.43 CP12 v3.0.0 Step 2).
//
// Regression detector: if a future refactor reintroduces ANY link in
// SezioneInfo (e.g. "Apri Guida", "Manuale", privacy policy, etc.),
// this test fails. Branding text preservation is also asserted.

describe('ImpostazioniTab — Sezione Info (CP2-bis Sessione 15 s.6.213)', () => {
  it('s.6.213 SezioneInfo non contiene link (single-affordance Guida via SezioneAiuto)', () => {
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    const info = screen.getByTestId('sezione-info');
    // Defensive: zero links inside SezioneInfo. Single source of truth = SezioneAiuto.
    expect(within(info).queryAllByRole('link')).toHaveLength(0);
    // Branding text retained.
    expect(info.textContent).toMatch(/PharmaTimer/);
    expect(info.textContent).toMatch(/by timegates/);
  });
});
