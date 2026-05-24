// src/data/repository/apiClient.js
//
// SENTINEL_N5I_CP1_PRE_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// HTTP client wrapper for ApiRepository (Fase 3 F3-S5-alpha, par.11.N-S3 N+5.I).
// Centralizes:
//  - X-User-Token header injection from localStorage
//  - HTTP method helpers (get/post/put/delete)
//  - HTTP status -> RepositoryError code mapping (sub-AMB L par.22.90)
//  - 3 body shape error normalization (sub-AMB L par.22.90 + EMP-17 par.22.91):
//      vocabulary: {error: {code, severity, message}} (RepositoryError handler)
//      401 detail: {detail: "..."} (HTTPException raw, drift-N44)
//      422 Pydantic: {detail: [{loc, msg, type}, ...]}
//
// HTTP status -> RepositoryError code:
//   401 -> UNAUTHORIZED (NEW enum N+5.I)
//   403 -> FORBIDDEN    (NEW enum N+5.I)
//   404 -> NOT_FOUND
//   409 -> CONSTRAINT_VIOLATION
//   422 -> CONSTRAINT_VIOLATION (validation pre-business)
//   5xx -> DB_UNAVAILABLE (critical, overridden severity)
//   network/fetch reject -> DB_UNAVAILABLE (critical)
//   other 4xx -> GENERIC

import { RepositoryError } from "./RepositoryError.js";

const TOKEN_STORAGE_KEY = "pharmatimer.userToken";

const HTTP_STATUS_TO_CODE = Object.freeze({
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONSTRAINT_VIOLATION",
  422: "CONSTRAINT_VIOLATION",
});

function _getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Normalize backend error body to {code, severity?, message} shape.
 * Sub-AMB L par.22.90 + EMP-17 par.22.91.
 *
 * @param {number} status HTTP status code
 * @param {any} body parsed JSON body (may be {} on parse failure)
 * @returns {{code: string, severity?: string, message: string}}
 */
function _normalizeErrorBody(status, body) {
  // Shape 1: vocabulary {error: {code, severity, message}}
  if (body && body.error && typeof body.error === "object") {
    return {
      code: body.error.code ?? HTTP_STATUS_TO_CODE[status] ?? "GENERIC",
      severity: body.error.severity,
      message: body.error.message ?? `HTTP ${status}`,
    };
  }
  // Shape 2/3: FastAPI 'detail' field (string for 401, array for 422)
  if (body && "detail" in body) {
    const d = body.detail;
    if (typeof d === "string") {
      return {
        code: HTTP_STATUS_TO_CODE[status] ?? "GENERIC",
        message: d,
      };
    }
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      const loc = Array.isArray(first.loc) ? first.loc.join(".") : "";
      const msg = first.msg ?? "Errore di validazione";
      return {
        code: HTTP_STATUS_TO_CODE[status] ?? "CONSTRAINT_VIOLATION",
        message: loc ? `${loc}: ${msg}` : msg,
      };
    }
  }
  return {
    code: HTTP_STATUS_TO_CODE[status] ?? "GENERIC",
    message: `HTTP ${status}`,
  };
}

async function _request(method, path, body) {
  const token = _getToken();
  if (!token) {
    throw new RepositoryError({
      code: "UNAUTHORIZED",
      message: "Token utente assente in localStorage (chiave pharmatimer.userToken)",
    });
  }
  const headers = { "X-User-Token": token };
  const opts = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let resp;
  try {
    resp = await fetch(path, opts);
  } catch (netErr) {
    throw new RepositoryError({
      code: "DB_UNAVAILABLE",
      message: "Errore di rete o backend irraggiungibile",
      cause: netErr,
    });
  }
  // 204 No Content (delete) -> null
  if (resp.status === 204) return null;
  // Parse JSON best-effort
  let parsed = {};
  try {
    const text = await resp.text();
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  if (resp.status >= 200 && resp.status < 300) return parsed;
  // 5xx -> always DB_UNAVAILABLE critical regardless of body
  if (resp.status >= 500) {
    const norm = _normalizeErrorBody(resp.status, parsed);
    throw new RepositoryError({
      code: "DB_UNAVAILABLE",
      message: norm.message,
      severity: "critical",
    });
  }
  const norm = _normalizeErrorBody(resp.status, parsed);
  throw new RepositoryError({
    code: norm.code,
    message: norm.message,
    severity: norm.severity,
  });
}

export const apiClient = Object.freeze({
  get: (path) => _request("GET", path),
  post: (path, body) => _request("POST", path, body),
  put: (path, body) => _request("PUT", path, body),
  delete: (path) => _request("DELETE", path),
});

// Exported for unit tests (mock localStorage shape verification).
export const _internals = Object.freeze({
  TOKEN_STORAGE_KEY,
  HTTP_STATUS_TO_CODE,
  _normalizeErrorBody,
});
