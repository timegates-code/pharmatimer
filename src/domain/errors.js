/**
 * Domain-level error.
 *
 * `code` is SCREAMING_SNAKE_CASE and stable (used by UI to branch on specific errors).
 * `message` is in Italian (user-facing or dev-facing through logs).
 *
 * Used in Session 4b by validation paths (e.g. applyRecupero with value > calcolaRecuperoMax).
 * Kept empty-of-callers in Session 4a per "no defensive validation" rule.
 */
export class DomainError extends Error {
  /**
   * @param {string} code    SCREAMING_SNAKE_CASE stable identifier.
   * @param {string} message Italian, human-readable.
   */
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
