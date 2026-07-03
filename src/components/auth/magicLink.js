// ============================================================
// magicLink.js -- magic-link token helpers (M2a par.22.191,
// extracted M2b-2 par.22.194). SENTINEL_M2B2_MAGICLINK_MODULE
// ============================================================
//
// Pure helpers (pattern shouldAutoClearUnauthorized): testable without DOM,
// no mocks of location / localStorage / reload needed. Extracted from
// App.jsx so LoginDialog.jsx can reuse them without a circular import
// (App.jsx imports LoginDialog.jsx). App.jsx re-exports parseMagicLinkToken
// to keep its historical import surface stable (App.magiclink.test.js).
//
// parseMagicLinkToken: extracts the user token from a magic-link fragment.
// Accepts ONLY '#token=<tok>' where <tok> is URL-safe base64 charset
// [A-Za-z0-9_-], min length 20. Backend token_plain is empirically 43 chars
// of exactly that charset (probe par.22.191); the 20 floor tolerates future
// regeneration schemes while rejecting spurious fragments. Any malformed or
// unknown hash returns null (Q3=A: total no-op, hash left untouched, the
// pre-existing LoginDialog flow is unchanged). The token value is NEVER
// logged, rendered, or included in error messages.
export function parseMagicLinkToken(hash) {
  if (typeof hash !== "string") return null;
  const m = /^#token=([A-Za-z0-9_-]{20,})$/.exec(hash);
  return m ? m[1] : null;
}

// normalizePastedToken (M2b-2 par.22.194, DEC-paste-tolerant par.22.192):
// normalizes the LoginDialog paste-field input to a candidate token.
//   - bare token (URL-safe base64, >= 20 chars) -> returned trimmed
//     (pre-M2b-2 fallback E-1-rev flow, byte-identical);
//   - full magic link 'https://host/#token=<tok>' or bare '#token=<tok>'
//     fragment -> token extracted via parseMagicLinkToken. Leading text
//     before '#' is tolerated (e.g. a pasted chat line containing the
//     link); trailing text after the token still rejects (same strict
//     anchored regex);
//   - anything else -> null (the caller decides the fallback; LoginDialog
//     falls back to the raw trimmed input, preserving today's behaviour:
//     probe fails -> 401 -> existing error message).
// The value is NEVER logged, rendered, or included in error messages.
export function normalizePastedToken(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  const hashIndex = trimmed.indexOf("#");
  if (hashIndex === -1) return null;
  return parseMagicLinkToken(trimmed.slice(hashIndex));
}
