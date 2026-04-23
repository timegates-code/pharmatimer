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
// Pattern: renderWithProvider stub context con `stateOverrides` e
// `actions` spy. Niente MemoryRouter (sezione non usa routing
// interno).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/renderHelpers.jsx';
import ImpostazioniTab from './ImpostazioniTab.jsx';

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

  it('in DEV renderizza la sezione con i 3 campi read-only', () => {
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
  });

  it('in PROD la sezione Avanzate non è renderizzata', () => {
    vi.stubEnv('DEV', false);
    renderWithProvider(<ImpostazioniTab />, {
      stateOverrides: { impostazioni: {} },
    });
    expect(screen.queryByTestId('sezione-avanzate')).not.toBeInTheDocument();
  });
});
