// ============================================================
// LoginDialog — PWA UI Login F3-S5-beta (CP3 N+5.P-bis, par.11.U-S3).
// ============================================================
//
// Direct token-entry dialog (drift-N5P.9: no backend auth/login endpoint).
// The user pastes the per-device shared-secret token; on submit we validate
// it against the live backend via GET /api/farmaci, persisting it to
// localStorage only on success.
//
// Design decisions (ratified CP1 N+5.P-bis):
//   D1 — top-level inline blocking overlay, mockup convention (fixed inset-0
//        z-50), no createPortal, no click-to-close (it gates app access),
//        no onClose prop.
//   D2 — validate via the cemented apiClient path: write candidate token,
//        call repo.getFarmaci(), roll back the localStorage write in finally
//        if the call did not succeed (never persist an unverified token).
//   D3 — on success, call onSuccess() so the parent (App.jsx, CP4) re-renders
//        / re-fetches with the now-valid token.
//
// Integration contract (cemented, NOT modified here):
//   - apiClient.js injects header X-User-Token from
//     localStorage['pharmatimer.userToken'] (drift-N5P.8 key).
//   - getRepository()/repo returns an ApiRepository when
//     localStorage['pharmatimer.useApiRepo'] === '1' (precondition of this
//     dialog being mounted, enforced by the CP4 gate).
//   - RepositoryError exposes .code: 'UNAUTHORIZED' (401) / 'DB_UNAVAILABLE'
//     (5xx / network) — see RepositoryError.js vocabulary.
//
// Theme: received via `theme` prop (mockup convention). Only flat scalar
// theme keys are used (cardBg / cardBorder are state-keyed objects and are
// deliberately avoided).

import { useState } from 'react';
import { repo } from '../../data/repository/index.js';
import { RepositoryError } from '../../data/repository/RepositoryError.js';
import { normalizePastedToken } from './magicLink.js'; // SENTINEL_M2B2_PASTE_IMPORT

const TOKEN_STORAGE_KEY = 'pharmatimer.userToken';

export default function LoginDialog({ theme: t, onSuccess }) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  const trimmed = tokenInput.trim();
  const canSubmit = trimmed.length > 0 && !validating;

  async function handleSubmit() {
    if (trimmed.length === 0 || validating) return;
    setValidating(true);
    setError(null);

    let ok = false;
    try {
      // D2: write candidate token so the cemented apiClient injects it, then
      // probe a cheap owner-scoped endpoint to confirm it authenticates.
      // M2b-2 (par.22.194, DEC-paste-tolerant par.22.192): the paste field
      // also accepts the FULL magic link (or the bare '#token=' fragment);
      // normalizePastedToken extracts the token, falling back to the raw
      // trimmed input so the pre-existing bare-token flow is byte-identical.
      // SENTINEL_M2B2_CANDIDATE
      const candidate = normalizePastedToken(tokenInput) ?? trimmed;
      localStorage.setItem(TOKEN_STORAGE_KEY, candidate);
      await repo.getFarmaci();
      ok = true;
    } catch (err) {
      const code = err instanceof RepositoryError ? err.code : 'GENERIC';
      if (code === 'UNAUTHORIZED') {
        setError('Token non valido. Controlla e riprova.');
      } else if (code === 'DB_UNAVAILABLE') {
        setError('Backend irraggiungibile. Verifica la connessione e riprova.');
      } else {
        setError('Errore durante la verifica del token. Riprova.');
      }
    } finally {
      if (!ok) {
        // Rollback: never leave an unverified token persisted.
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          /* localStorage unavailable: nothing to roll back */
        }
      }
      setValidating(false);
    }

    if (ok && typeof onSuccess === 'function') onSuccess();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: t.modalOverlay }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: t.modalBg, border: `1px solid ${t.headerBorder}` }}
      >
        <h2
          id="login-title"
          className="text-lg font-bold mb-1"
          style={{ color: t.textPrimary, letterSpacing: '-0.02em' }}
        >
          Accesso PharmaTimer
        </h2>
        <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
          Incolla il link ricevuto oppure il token utente del dispositivo per
          accedere ai tuoi dati.
        </p>

        <label
          htmlFor="login-token"
          className="block text-sm font-medium mb-1"
          style={{ color: t.textPrimary }}
        >
          Token utente
        </label>

        <div className="relative">
          <input
            id="login-token"
            type={showToken ? 'text' : 'password'}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={validating}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Incolla qui il token o il link"
            className="w-full rounded-lg px-3 py-2 pr-20 text-sm outline-none"
            style={{
              background: t.pageBg,
              border: `1px solid ${t.tapBd}`,
              color: t.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={() => setShowToken((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 rounded"
            style={{ color: t.textSecondary }}
            aria-label={showToken ? 'Nascondi token' : 'Mostra token'}
          >
            {showToken ? 'Nascondi' : 'Mostra'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm rounded-lg px-3 py-2 mt-3"
            style={{ background: t.redBg, color: t.redTx }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-4 rounded-lg py-2.5 text-sm font-semibold"
          style={
            canSubmit
              ? { background: t.blueBg, color: t.blueTx }
              : { background: t.btnDisabledBg, color: t.btnDisabledTx }
          }
        >
          {validating ? 'Verifica in corso…' : 'Entra'}
        </button>
      </div>
    </div>
  );
}
