/**
 * @fileoverview CS-4 -- outbox splitter and delivery mapping (Spec sez. 14.3).
 * par.22.198-triginties (S2b). PURE module: no Dexie, no network, no globals
 * except the injectable defaults below. `src/domain` never imports `src/data`,
 * so the import graph stays acyclic.
 *
 * SEME INERTE: nessun chiamante di produzione in S2b. Il cablaggio (override
 * di upsertLogsBatch nel guardiano, transazione indivisibile, consegna FIFO)
 * e S2c.
 *
 * --- Cosa fa ---
 * `splitIntoElements` turns the logWrites of ONE gesture into 1..N outbox
 * elements (Q4.A shape). `deriveDelivery` turns an element into a delivery
 * route AT DELIVERY TIME (Q-OP2=A: the route is DERIVED, never frozen in the
 * element -- a route frozen by a code version that no longer exists would be
 * unroutable, i.e. an undeliverable element = M2 violated).
 *
 * --- Regole ratificate ---
 * Q-OP1=A  the element records the GESTURE (`op`), 7 values identical to the
 *          thunk names; no translation anywhere along the chain.
 * Q2.A     adjacent pair [presa, ricalcolata] same farmaco -> ONE element
 *          delivered as an atomic batch; every other row -> its own element.
 * R-1      `annullaUltima` / `annullaAssunzione` -> ONE element even with 2
 *          rows, delivered as ONE `undo` request (the backend rolls the D+1
 *          back server-side). Rows after the first are carried for PROTECTION
 *          ONLY: they are never delivered, but they keep their dose key inside
 *          the element so `outboxProtectedKeys()` shields them from the mirror
 *          until delivery (M2). Splitting them would send a second `undo` onto
 *          a slot the server already rolled back -> error with the first
 *          request applied = M1.
 * R-2 (A)  invariant is OP-SCOPED: inside the `presa` gesture a `ricalcolata`
 *          row must belong to a pair, otherwise the element PARKS. Outside
 *          `presa` a lone `ricalcolata` is LEGITIMATE (`ripristina`,
 *          `annulla*`) and routes to `undo` -- measured, and corroborated in
 *          production at par.22.197-ter (in-place UPDATE, GREEN).
 * R-3 (A)  the mapping encodes the TARGET semantics: `recupero` -> `recupero`.
 *          DIVERGENZA DICHIARATA vs `ApiRepository._dispatchLogVerb`, which
 *          today routes those rows to `undo` because the recupero row carries
 *          stato='ricalcolata' (guard `applyRecupero`, finding #18-L1).
 *          Harmless in S2b (no production caller); S2c adds the verb-aware
 *          delivery adapter and the divergence disappears.
 * R-4 (A)  PARK-ON-UNKNOWN, non negotiable: whenever the split or the
 *          derivation does not recognise something, the element is PARKED with
 *          an explicit reason -- NEVER dropped, NEVER sent on a guessed route.
 *
 * --- Bit-identita del pairing ---
 * `isAtomicPresaPlusRicalc` is a byte-for-byte transcription of
 * `ApiRepository._isAtomicPresaPlusRicalc`. Both deviations are clinically
 * dangerous: a looser pairing fails the API-side predicate and degrades to two
 * sequential calls with the `ricalcolata` row landing on `undo`; a stricter
 * pairing splits the couple and the lone `ricalcolata` reaches `undo` anyway.
 * If that predicate ever changes, THIS function must change with it.
 *
 * SENTINEL_S2B_OUTBOXSPLITTER
 */

/** The 7 gesture verbs (Q-OP1=A), identical to the thunk names. */
export const OUTBOX_OPS = Object.freeze([
  'presa',
  'salta',
  'sospendi',
  'recupero',
  'ripristina',
  'annullaUltima',
  'annullaAssunzione',
]);

/** Delivery verbs = the `/log/<verb>` path segment. */
export const DELIVERY_VERBS = Object.freeze({
  PRESA: 'presa',
  SALTATA: 'saltata',
  SOSPESA: 'sospesa',
  UNDO: 'undo',
  RECUPERO: 'recupero',
});

/** Explicit park reasons (surfaced in the Centro invii, CS-5). */
export const PARK_REASONS = Object.freeze({
  OP_SCONOSCIUTO: 'OP_SCONOSCIUTO',
  PAIRING_FALLITO: 'PAIRING_FALLITO',
  ROTTA_NON_DERIVABILE: 'ROTTA_NON_DERIVABILE',
});

const UNDO_STATI = Object.freeze(['prevista', 'ricalcolata']);

/**
 * Bit-identical transcription of ApiRepository._isAtomicPresaPlusRicalc.
 * Exactly 2 rows, first 'presa', second 'ricalcolata', same farmaco_id.
 * NO check on the dates -- deliberately, like the original.
 *
 * @param {any[]} logs
 * @returns {boolean}
 */
export function isAtomicPresaPlusRicalc(logs) {
  if (!Array.isArray(logs) || logs.length !== 2) return false;
  const [first, second] = logs;
  return Boolean(
    first &&
      second &&
      first.stato === 'presa' &&
      second.stato === 'ricalcolata' &&
      first.farmaco_id === second.farmaco_id,
  );
}

function defaultNewId() {
  return globalThis.crypto.randomUUID();
}

function defaultNow() {
  return new Date().toISOString();
}

/**
 * Build one outbox element (Q4.A shape). The primary dose fields come from
 * rows[0] and feed the Centro invii listing.
 */
function makeElement(op, rows, newId, now, parkedReason) {
  const primary = rows[0] || {};
  const parked = Boolean(parkedReason);
  return {
    stato: parked ? 'parked' : 'pending',
    op,
    client_op_id: newId(),
    logs: rows,
    farmaco_id: primary.farmaco_id ?? null,
    data: primary.data ?? null,
    dose_numero: primary.dose_numero ?? null,
    created_at: now(),
    attempts: 0,
    parked_reason: parkedReason || null,
    parked_at: parked ? now() : null,
  };
}

/**
 * Split the logWrites of ONE gesture into 1..N outbox elements.
 *
 * @param {object} args
 * @param {string|null} args.op gesture verb (Q-OP1=A)
 * @param {any[]} args.logs logWrites produced by the domain
 * @param {() => string} [args.newId] injected for deterministic tests; the
 *        rule is unchanged (ONE targa per element, generated at the tap)
 * @param {() => string} [args.now] injected for deterministic tests
 * @returns {any[]} outbox elements, in gesture order
 */
export function splitIntoElements({ op, logs, newId = defaultNewId, now = defaultNow }) {
  const rows = Array.isArray(logs) ? logs.filter(Boolean) : [];
  if (rows.length === 0) return [];

  // PARK-ON-UNKNOWN (R-4): an unrecognised gesture keeps ALL its rows inside a
  // single parked element -- nothing is lost and every dose key stays
  // protected from the mirror.
  if (!OUTBOX_OPS.includes(op)) {
    return [makeElement(op ?? null, rows, newId, now, PARK_REASONS.OP_SCONOSCIUTO)];
  }

  // R-1: the undo gestures are ONE element carrying every row.
  if (op === 'annullaUltima' || op === 'annullaAssunzione') {
    return [makeElement(op, rows, newId, now, null)];
  }

  // Q2.A: adjacent pairing, then one element per remaining row.
  const elements = [];
  let i = 0;
  while (i < rows.length) {
    const pair = rows.slice(i, i + 2);
    if (isAtomicPresaPlusRicalc(pair)) {
      elements.push(makeElement(op, pair, newId, now, null));
      i += 2;
      continue;
    }
    const row = rows[i];
    // R-2 (A): op-scoped invariant. Inside `presa`, a `ricalcolata` row that
    // did not pair must NOT travel alone -- it would reach /log/undo and the
    // N+1 would lose its recalculation (M1). Outside `presa` a lone
    // `ricalcolata` is legitimate.
    const parkedReason =
      op === 'presa' && row.stato === 'ricalcolata'
        ? PARK_REASONS.PAIRING_FALLITO
        : null;
    elements.push(makeElement(op, [row], newId, now, parkedReason));
    i += 1;
  }
  return elements;
}

/**
 * Derive the delivery route of an element AT DELIVERY TIME (Q-OP2=A).
 * Pure function of (op, rows). Returns null when the route cannot be derived:
 * the caller MUST park the element (PARK-ON-UNKNOWN), never guess a route.
 *
 * @param {any} element outbox element produced by splitIntoElements
 * @returns {{method: 'batch'|'single', verb: string, rows: any[]}|null}
 */
export function deriveDelivery(element) {
  if (!element || !OUTBOX_OPS.includes(element.op)) return null;
  const rows = Array.isArray(element.logs) ? element.logs.filter(Boolean) : [];
  if (rows.length === 0) return null;

  // R-1: one request, derived from the first row; the rest are protection only.
  if (element.op === 'annullaUltima' || element.op === 'annullaAssunzione') {
    return { method: 'single', verb: DELIVERY_VERBS.UNDO, rows: [rows[0]] };
  }

  // Q2.A: the couple travels as ONE atomic batch on the presa verb.
  if (isAtomicPresaPlusRicalc(rows)) {
    return { method: 'batch', verb: DELIVERY_VERBS.PRESA, rows };
  }

  if (rows.length !== 1) return null;
  const row = rows[0];

  // R-3: TARGET semantics. Checked BEFORE the stato mapping, because the
  // recupero row carries stato='ricalcolata' (guard in applyRecupero) and
  // would otherwise be read as an undo -- which is exactly finding #18-L1.
  if (element.op === 'recupero') {
    return { method: 'single', verb: DELIVERY_VERBS.RECUPERO, rows };
  }

  // R-2 (A): inside `presa` a lone `ricalcolata` is never routable.
  if (element.op === 'presa' && row.stato === 'ricalcolata') return null;

  if (row.stato === 'presa') {
    return { method: 'single', verb: DELIVERY_VERBS.PRESA, rows };
  }
  if (row.stato === 'saltata') {
    return { method: 'single', verb: DELIVERY_VERBS.SALTATA, rows };
  }
  if (row.stato === 'sospesa') {
    return { method: 'single', verb: DELIVERY_VERBS.SOSPESA, rows };
  }
  if (UNDO_STATI.includes(row.stato)) {
    return { method: 'single', verb: DELIVERY_VERBS.UNDO, rows };
  }
  return null;
}
