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
  // s.6.266 (Q-QUATER-2=A, par.198-quinquetriginties-quater). A failed
  // delivery reaches the client as `CONSTRAINT_VIOLATION` whether it was a
  // true 409 conflict or a broken 4xx: `exceptions.py` has no conflict code
  // and `apiClient` maps 409 and 422 onto the same key (both MEASURED).
  // Spec 14.3 asks for opposite actions on those two rows -- drop vs park --
  // so the element is PARKED for both: dropping a broken 4xx would lose a
  // dose really taken (M2) and send the card back to "da prendere" (M1),
  // while parking a true 409 loses nothing (the parking lot never discards).
  // Reversible: once the server vocabulary grows a CONFLICT code (S3), the
  // 409 branch goes back to drop, per the letter of 14.3.
  // SENTINEL_S6266_PARK_REASON
  CONFLITTO_O_RICHIESTA_ROTTA: 'CONFLITTO_O_RICHIESTA_ROTTA',

  // ---- Q-QQUIN-1=A / Q-QQUIN-2=A (par.22.198-quadragies-quinquies) ----
  // Q-QUADRAG-5-bis=A enumerates FOUR new reasons on a base of four, so
  // Object.values() holds EIGHT constants. SEVEN of them are ACTIVE: the
  // eighth is CONFLITTO_O_RICHIESTA_ROTTA above, RETIRED from emission but
  // never removed. Append-only is not bureaucracy here -- rows already
  // parked in the pilot's IndexedDB carry that string, and the Centro invii
  // (14.5) must still be able to explain them. A reason the vocabulary no
  // longer knows is a real gesture no surface can account for (M2).
  //
  // The reason is what the PERSON reads in the parking lot -- Spec 14.3
  // asks for "perche e qui" in plain words -- so a false label is a false
  // explanation. That is why the catch-all was split.

  // Server said CONFLICT: a real divergence, the row was written by someone
  // else. Parked and NOT dropped while the visible warning of 14.5 does not
  // exist (s.6.267, reversibility anchored to CS-5).
  // UNREACHABLE TODAY BY MEASURE: the literal CONFLICT exists nowhere in
  // backend/pharmatimer_api. Wired anyway (Q-QQUIN-2=A) so there is no
  // window in which the server tells the truth and the client mislabels it:
  // apiClient :57 reads body.error.code BEFORE HTTP_STATUS_TO_CODE, so a new
  // server code crosses the client without touching a VIETATO file.
  // SENTINEL_S6267_PARK_REASON
  CONFLITTO_VERO: 'CONFLITTO_VERO',

  // CONSTRAINT_VIOLATION. 409 and 422 collapse onto this single client code
  // (apiClient :33-34, MEASURED), so against a server that cannot emit
  // CONFLICT -- the Mini, today -- a TRUE conflict lands here as well:
  // imprecise label, identical action, zero clinical stake. Degradation by
  // construction, not by accident (clausola di asimmetria di versione).
  RICHIESTA_ROTTA: 'RICHIESTA_ROTTA',

  // NOT_FOUND. The name says farmaco OR dose deliberately: the ownership
  // check (log_assunzioni.py :41-53) collapses missing / other-user /
  // inactive onto 404 by security-by-obscurity, so this reason also covers
  // "the farmaco is no longer yours", the gravest of the three.
  // DOSE_NON_TROVATA was rejected at quadragies for naming only one of them.
  FARMACO_O_DOSE_ASSENTE: 'FARMACO_O_DOSE_ASSENTE',

  // Residual branch of the TRANSPORT class only. Q-SEX-2=A partitioned the
  // old population POSITIONALLY: what reaches here now is a delivery that
  // failed with a `.code` the taxonomy does not name -- GENERIC, i.e. any
  // other 4xx -- and Spec 14.3 parks it at once, without retry, because
  // retrying does not heal a broken request. FORBIDDEN would land here too
  // but is NOT reachable from the queue: the five verbs mount only
  // get_current_user / get_db, while FORBIDDEN is raised solely by
  // require_owner and assert_admin_on_paziente.
  //
  // A raw throw with NO `.code` NO LONGER lands here: it is the internal
  // class and it is re-thrown to the drain, which counts it.
  ERRORE_NON_CLASSIFICATO: 'ERRORE_NON_CLASSIFICATO',

  // ---- Q-SEX-2=A / Q-SEX-3=A / Q-SEX-4=A (par.22.198-quadragies-sexies) ----
  // Internal app exception, budget spent. Spec 14.3 gives this class -- and
  // ONLY this class -- a counter: three failed deliveries, then the parking
  // lot. It needs a reason of its own: reusing ERRORE_NON_CLASSIFICATO would
  // put ONE label on TWO different journeys, an immediate park and three
  // failed attempts, which is exactly the defect Q-QQUIN-2=A removed when it
  // split the catch-all. The reason is what the PERSON reads in the Centro
  // invii (14.5), so it must say what actually happened.
  // SENTINEL_SEX_PARK_REASON
  ERRORE_INTERNO_RIPETUTO: 'ERRORE_INTERNO_RIPETUTO',
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
