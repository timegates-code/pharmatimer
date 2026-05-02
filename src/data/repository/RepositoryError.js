// src/data/repository/RepositoryError.js
//
// CP1a (Step 11-A, AMB-11.A.1/2): typed error class for repository layer.
//
// Contract:
//   - LocalRepository.* methods MUST throw RepositoryError on failure
//     (wrapping the raw IndexedDB / Dexie error via wrapRepoError).
//   - actions.js / applyHelper.js MUST catch and dispatch SET_ERROR with
//     payload { kind: 'repo', code, severity, message }.
//   - severity ∈ {'warning', 'error', 'critical'} per AMB-11.A.2.
//
// Code vocabulary (AMB-11.A.1, D2):
//   DB_UNAVAILABLE       — IndexedDB closed/blocked/upgrade-needed → critical
//   TRANSACTION_ABORT    — Dexie transaction aborted              → critical
//   CONSTRAINT_VIOLATION — uniqueness / FK / schema violation     → error
//   NOT_FOUND            — record not present                     → warning
//   GENERIC              — fallback for unclassified errors       → error
//
// Future Fase 3 note: ApiRepository (FastAPI client) MUST honor the same
// contract, mapping HTTP errors to the same code vocabulary.

/**
 * Default severity for each known code. New codes added later MUST
 * register their default here; unknown codes fall back to 'error'.
 */
export const SEVERITY_BY_CODE = Object.freeze({
  DB_UNAVAILABLE: 'critical',
  TRANSACTION_ABORT: 'critical',
  CONSTRAINT_VIOLATION: 'error',
  NOT_FOUND: 'warning',
  GENERIC: 'error',
});

/**
 * Allowed severity values (AMB-11.A.2).
 */
export const SEVERITY_VALUES = Object.freeze(['warning', 'error', 'critical']);

/**
 * Typed repository error. Extends Error so existing `instanceof Error`
 * checks (e.g. catch blocks in actions.js) keep working.
 */
export class RepositoryError extends Error {
  /**
   * @param {object} opts
   * @param {string} opts.code     — one of SEVERITY_BY_CODE keys (or custom)
   * @param {string} opts.message  — human-readable Italian message
   * @param {string} [opts.severity] — override default severity for the code
   * @param {unknown} [opts.cause]   — original raw error (preserved for debug)
   */
  constructor({ code, message, severity, cause } = {}) {
    super(message ?? code ?? 'Errore repository');
    this.name = 'RepositoryError';
    this.code = code ?? 'GENERIC';
    this.severity = severity ?? SEVERITY_BY_CODE[this.code] ?? 'error';
    if (cause !== undefined) this.cause = cause;
  }

  /**
   * Plain object suitable for SET_ERROR dispatch payload.
   * Reducer extends existing { kind: 'repo', message } shape with
   * severity + code (backward-compat: older reducer reads message only).
   */
  toPayload() {
    return {
      kind: 'repo',
      code: this.code,
      severity: this.severity,
      message: this.message,
    };
  }
}

/**
 * Wrap a raw error (typically caught from Dexie / IndexedDB) into a
 * RepositoryError with the given code. Preserves the original error
 * as `cause` for debugging.
 *
 * @param {unknown} rawErr   — original thrown value
 * @param {string} code      — code vocabulary key
 * @param {string} [message] — override message; defaults to rawErr.message
 * @param {string} [severity] — override severity (else lookup by code)
 * @returns {RepositoryError}
 */
export function wrapRepoError(rawErr, code, message, severity) {
  if (rawErr instanceof RepositoryError) {
    // Already wrapped — preserve identity, do not re-wrap.
    return rawErr;
  }
  const fallbackMsg =
    (rawErr && typeof rawErr === 'object' && 'message' in rawErr
      ? String(rawErr.message)
      : null) ?? 'Errore repository';
  return new RepositoryError({
    code,
    message: message ?? fallbackMsg,
    severity,
    cause: rawErr,
  });
}

/**
 * Heuristic to classify a raw Dexie / IndexedDB error into a code.
 * Used by LocalRepository._wrap() helper to keep call-site noise low.
 *
 * Recognized Dexie error names:
 *   - DatabaseClosedError, InvalidStateError, VersionError → DB_UNAVAILABLE
 *   - AbortError, TransactionInactiveError                  → TRANSACTION_ABORT
 *   - ConstraintError, DataError                            → CONSTRAINT_VIOLATION
 *   - (no record found is signaled by undefined return, not an error,
 *      so NOT_FOUND is set explicitly by repo methods, not auto-classified)
 */
export function classifyRawError(rawErr) {
  if (!rawErr || typeof rawErr !== 'object') return 'GENERIC';
  const name = rawErr.name ?? '';
  if (
    name === 'DatabaseClosedError' ||
    name === 'InvalidStateError' ||
    name === 'VersionError' ||
    name === 'UnknownError'
  ) {
    return 'DB_UNAVAILABLE';
  }
  if (name === 'AbortError' || name === 'TransactionInactiveError') {
    return 'TRANSACTION_ABORT';
  }
  if (name === 'ConstraintError' || name === 'DataError') {
    return 'CONSTRAINT_VIOLATION';
  }
  return 'GENERIC';
}
