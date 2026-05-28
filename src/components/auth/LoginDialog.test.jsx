// ============================================================
// LoginDialog — tests (CP3 N+5.P-bis, par.11.U-S3).
// ============================================================
//
// Harness (empirico CP3.0): vitest.config.js prevails -> globals:false
// (explicit imports from 'vitest') + setupFiles ./src/test/setup.js
// (jest-dom matchers). jsdom provides localStorage.
//
// The repository factory module is mocked at module level so that the
// eager singleton `repo` (export const repo = getRepository()) does not
// instantiate a real LocalRepository, and so getFarmaci is a controllable
// spy. RepositoryError.js is NOT mocked: the real class is used so
// `err instanceof RepositoryError` inside the component holds.
//
// Scope CP3: 6 tests
//   1. render: token input (password) + Entra disabled when empty
//   2. typing a token enables Entra
//   3. happy: getFarmaci resolves -> token persisted + onSuccess called
//   4. 401 UNAUTHORIZED: inline error + token NOT persisted (rollback) +
//      onSuccess not called
//   5. DB_UNAVAILABLE: distinct inline error + token not persisted
//   6. show/hide toggle flips input type password <-> text

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginDialog from './LoginDialog.jsx';
import { repo } from '../../data/repository/index.js';
import { RepositoryError } from '../../data/repository/RepositoryError.js';

vi.mock('../../data/repository/index.js', () => ({
  repo: { getFarmaci: vi.fn() },
  getRepository: vi.fn(),
}));

const TOKEN_KEY = 'pharmatimer.userToken';

// Minimal fake theme: only the flat scalar keys LoginDialog reads.
const THEME = {
  modalOverlay: 'rgba(0,0,0,0.5)',
  modalBg: '#FFFFFF',
  headerBorder: '#E7E5E0',
  pageBg: '#FAFAF7',
  tapBd: '#D6D3D1',
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  redBg: '#FEF2F2',
  redTx: '#991B1B',
  blueBg: '#EFF6FF',
  blueTx: '#1D4ED8',
  btnDisabledBg: '#F5F5F1',
  btnDisabledTx: '#A8A29E',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('LoginDialog (F3-S5-beta CP3)', () => {
  it('renderizza il campo token (password) e Entra disabilitato a input vuoto', () => {
    render(<LoginDialog theme={THEME} onSuccess={vi.fn()} />);
    const input = screen.getByLabelText('Token utente');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entra' })).toBeDisabled();
  });

  it('digitando un token abilita il bottone Entra', async () => {
    const user = userEvent.setup();
    render(<LoginDialog theme={THEME} onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText('Token utente'), 'abc123');
    expect(screen.getByRole('button', { name: 'Entra' })).toBeEnabled();
  });

  it('token valido: persiste in localStorage e chiama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(repo.getFarmaci).mockResolvedValueOnce([]);

    render(<LoginDialog theme={THEME} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Token utente'), 'valid-token-xyz');
    await user.click(screen.getByRole('button', { name: 'Entra' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('valid-token-xyz');
    expect(repo.getFarmaci).toHaveBeenCalledTimes(1);
  });

  it('token 401 UNAUTHORIZED: errore inline, nessun token persistito (rollback), no onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(repo.getFarmaci).mockRejectedValueOnce(
      new RepositoryError({ code: 'UNAUTHORIZED', message: 'Token utente assente' }),
    );

    render(<LoginDialog theme={THEME} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Token utente'), 'bad-token');
    await user.click(screen.getByRole('button', { name: 'Entra' }));

    expect(await screen.findByText(/Token non valido/)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('backend DB_UNAVAILABLE: messaggio distinto, nessun token persistito', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(repo.getFarmaci).mockRejectedValueOnce(
      new RepositoryError({ code: 'DB_UNAVAILABLE', message: 'Backend giu' }),
    );

    render(<LoginDialog theme={THEME} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Token utente'), 'some-token');
    await user.click(screen.getByRole('button', { name: 'Entra' }));

    expect(await screen.findByText(/Backend irraggiungibile/)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('toggle mostra/nascondi commuta il tipo del campo token', async () => {
    const user = userEvent.setup();
    render(<LoginDialog theme={THEME} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Token utente')).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostra token' }));
    expect(screen.getByLabelText('Token utente')).toHaveAttribute('type', 'text');
  });
});
