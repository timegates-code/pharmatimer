// ============================================================
// SyncRepository — read-path guard for the API path (CS-3, Spec 14.4).
// ============================================================
// par.22.198-sexvicies (CS-3 sessione 2/2). Composition wrapper placed
// by the repository factory ONLY when shouldUseApiRepo() is true. It
// wraps an ApiRepository (`_api`) and shares the same LocalRepository
// (`_local`, whose Dexie `db` is a module singleton) as a read-mirror.
//
// Contract (metro clinico Spec 14.0 — the THREE NEVERS):
//  - The three server-backed reads (getFarmaci / getAllOrari /
//    getLogByRange) go to the server; on success they refresh the local
//    mirror and stamp freshness, then return the SERVER data.
//  - On `err.code === "DB_UNAVAILABLE"` (offline or server-down, per the
//    apiClient error taxonomy) they fall back to the local mirror and
//    return stale data WITHOUT bumping freshness (staleness is part of
//    the datum). Any other error (UNAUTHORIZED, business) PROPAGATES.
//  - Q-ZANCA-3=A: those same branches also drive the `_unreachable`
//    latch (Spec 14.2.6 :1083, Q-ZAGARA-1=A). DB_UNAVAILABLE lights
//    it; ANY other code extinguishes it, because a code proves the
//    server ANSWERED; a throw with no `.code` is a Dexie fault and
//    touches NOTHING. The single extinction seat is _bumpFreshness().
//  - Composition (not inheritance) is required: ApiRepository.getAllOrari
//    and getLogByRange fan out to `this.getFarmaci()`; a dynamically
//    dispatched inherited override would double-write the mirror and tear
//    the fallback. Here the fan-out stays raw inside `_api`.
//  - Every other method is an explicit one-line forwarder to `_api`
//    (27 forwarders). A completeness vitest guards against surface drift.
//  - upsertLogsBatch is NO LONGER a forwarder (CS-4 S2c-2b): it is the
//    offline write-path -- taccuino-prima anche online, indivisible touch,
//    FIFO delivery. See the write-path section at the bottom.
//
// Freshness (Q4=A): owned here, persisted in localStorage under
// MIRROR_FRESHNESS_KEY (ISO-8601 UTC), bumped ONLY after a successful
// server read AND after the mirror-write. Persisted (not in-memory) so a
// cold offline boot can read it (Spec 14.4.6 / 14.5.3). Exposed via
// getMirrorFreshness() for CS-5.
//
// SENTINEL_PAR_22_198_QUINVICIES_SYNCREPO

import {
  splitIntoElements,
  deriveDelivery,
  PARK_REASONS,
} from "../../domain/outboxSplitter.js";
// SENTINEL_S6273_IMPORT
// s.6.273 / Q-NODO-2=A. Sibling import, the direction Q-LETTO-6=A chose
// when it seated the notice store beside the guardian: no new edge.
// SENTINEL_QTARGA_IMPORT_ELENCA
// Q-TARGA-2=B. `elencaAvvisi` joins the SAME sibling import that
// Q-LETTO-6=A already opened: zero new edges in the import graph. The
// guardian gains a read exactly where it already writes.
import { salvaAvviso, MOTIVI_AVVISO, elencaAvvisi } from "./avvisiStore.js";
// SENTINEL_QOCT_IMPORT_GATE
import { OUTBOX_ATTEMPT_GATE_MS } from "../../domain/constants.js";

const MIRROR_FRESHNESS_KEY = "pharmatimer.mirrorFreshness";

// Q-SEX-3=A / Q-SEX-4=A: Spec 14.3 gives the internal-exception class --
// and only it -- a counter. Three failed deliveries, then the parking lot.
const INTERNAL_MAX_ATTEMPTS = 3;

export class SyncRepository {
  constructor(api, local) {
    this._api = api;
    this._local = local;
    // SENTINEL_QOCT_DRAINING_FIELD
    // Q-QSEPT-3=A: non-overlap guard as an INSTANCE field. Legitimate
    // because `repo` is an eager singleton (repository/index.js, measured
    // at CS-4.25): every trigger reaches the same object, so one flag is
    // enough and no module-level state is needed.
    this._draining = false;
    // SENTINEL_QZANCA_UNREACHABLE_FIELD
    // Q-ZAGARA-1=A / Q-OGIVA-6=A: the third indicator state is an
    // ORTHOGONAL latch (Spec 14.2.6 :1083), not a fourth value in the
    // precedence, so it lives in a field instead of widening
    // STATI_CODA. Instance field for the reason `_draining` is one.
    // `null` means NOT YET MEASURED, a DIFFERENT fact from `false`,
    // which would assert a link never observed. THE POLARITY IS IN THE
    // NAME: no site has to remember an inversion.
    this._unreachable = null;
  }

  // ---- Freshness (Q4=A) ------------------------------------

  getMirrorFreshness() {
    try {
      return localStorage.getItem(MIRROR_FRESHNESS_KEY);
    } catch {
      return null;
    }
  }

  _bumpFreshness() {
    // SENTINEL_QZANCA_SPEGNI_SEDE_UNICA
    // Q-OGIVA-4=A -- SINGLE SEAT. The three guarded reads call this
    // AFTER a successful mirror-write, so all three inherit the
    // extinction BY CONSTRUCTION. Placed BEFORE the try on purpose: a
    // lone localStorage failure must not skip a fact about
    // connectivity.
    this._unreachable = false;
    // Benign best-effort: a lone localStorage failure leaves the mirror
    // updated but the timestamp behind (display-only staleness, never
    // M1/M2/M3). Written AFTER the mirror-write by the callers.
    try {
      localStorage.setItem(MIRROR_FRESHNESS_KEY, new Date().toISOString());
    } catch {
      // ignore — freshness is advisory
    }
  }

  // ---- Guarded server-backed reads -------------------------

  async getFarmaci(opts = {}) {
    try {
      const data = await this._api.getFarmaci(opts);
      await this._local.mirrorFarmaci(data);
      this._bumpFreshness();
      return data;
    } catch (err) {
      // SENTINEL_QZANCA_LATCH_READ_FARMACI
      // Q-OGIVA-11=A plus Q-ZANCA-3=A. Any code OTHER than
      // DB_UNAVAILABLE proves the server ANSWERED, so it EXTINGUISHES.
      // A throw with no `.code` is a Dexie fault and touches NOTHING.
      if (err && err.code) this._unreachable = err.code === "DB_UNAVAILABLE";
      if (err && err.code === "DB_UNAVAILABLE") {
        return this._local.getFarmaci({ soloAttivi: true });
      }
      throw err;
    }
  }

  async getAllOrari() {
    try {
      const data = await this._api.getAllOrari();
      await this._local.mirrorOrari(data);
      this._bumpFreshness();
      return data;
    } catch (err) {
      // SENTINEL_QZANCA_LATCH_READ_ORARI
      // Q-OGIVA-11=A plus Q-ZANCA-3=A. Any code OTHER than
      // DB_UNAVAILABLE proves the server ANSWERED, so it EXTINGUISHES.
      // A throw with no `.code` is a Dexie fault and touches NOTHING.
      if (err && err.code) this._unreachable = err.code === "DB_UNAVAILABLE";
      if (err && err.code === "DB_UNAVAILABLE") {
        return this._local.getAllOrari();
      }
      throw err;
    }
  }

  async getLogByRange(dataDa, dataA) {
    try {
      const data = await this._api.getLogByRange(dataDa, dataA);
      await this._local.mirrorLogWindow(data, dataDa, dataA);
      this._bumpFreshness();
    } catch (err) {
      // SENTINEL_QZANCA_LATCH_READ_LOG
      // Q-OGIVA-11=A plus Q-ZANCA-3=A. Any code OTHER than
      // DB_UNAVAILABLE proves the server ANSWERED, so it EXTINGUISHES.
      // A throw with no `.code` is a Dexie fault and touches NOTHING.
      if (err && err.code) this._unreachable = err.code === "DB_UNAVAILABLE";
      if (err && err.code === "DB_UNAVAILABLE") {
        return this._local.getLogByRange(dataDa, dataA);
      }
      throw err;
    }
    // CS-4 S2c-2b (c4) -- voce 38 + Q-TER-2=A. The window is returned by
    // RE-READING the mirror we have just written, never the raw server
    // payload: mirrorLogWindow shields the rows held by a live outbox
    // promise (14.4.4), so returning the snapshot would hand the caller
    // exactly what the shield had rejected -- the dose would reappear "da
    // prendere" (M1) and the queued gesture would look lost (M2).
    // The re-read sits OUTSIDE the try above ON PURPOSE (Q-TER-2=A): a
    // local Dexie failure classified DB_UNAVAILABLE must NOT be mistaken
    // for a server outage, must NOT trigger the fallback re-read of the
    // very same call, and must reach the caller unmasked.
    // SENTINEL_S2C2B_REREAD_RETURN
    return this._local.getLogByRange(dataDa, dataA);
  }

  // ---- Explicit forwarders (27) ----------------------------
  // SENTINEL_QOCT_FORWARDER_COUNT
  // Q-QOCT-5=A: the header said 28 until CS-4 S2c-2b turned
  // upsertLogsBatch into the write-path; the count was never decremented.
  // MEASURED at CS-4.26: 27 `return this._api.` lines, 27 distinct names.
  // `drainOutbox` is NOT a forwarder and does not count here.
  // Everything else delegates verbatim to the ApiRepository. Kept
  // explicit (not a Proxy) so the completeness vitest can see them and
  // the surface stays auditable. getLogByData forwards raw (devCheck-only
  // consumer, no mirror — scope boundary, not a deviation).

  getProfili() { return this._api.getProfili(); }
  getProfiloAttivo() { return this._api.getProfiloAttivo(); }
  addProfilo(p) { return this._api.addProfilo(p); }
  updateProfilo(id, patch) { return this._api.updateProfilo(id, patch); }
  deleteProfilo(id) { return this._api.deleteProfilo(id); }
  setProfiloAttivo(id) { return this._api.setProfiloAttivo(id); }
  setProfiloAttivoConCleanup(profiloId, logsToDelete) { return this._api.setProfiloAttivoConCleanup(profiloId, logsToDelete); }
  getSetting(chiave) { return this._api.getSetting(chiave); }
  setSetting(chiave, valore) { return this._api.setSetting(chiave, valore); }
  getAllSettings() { return this._api.getAllSettings(); }
  getFarmaco(id) { return this._api.getFarmaco(id); }
  addFarmaco(f) { return this._api.addFarmaco(f); }
  updateFarmaco(id, patch) { return this._api.updateFarmaco(id, patch); }
  deleteFarmaco(id) { return this._api.deleteFarmaco(id); }
  getOrariByFarmaco(farmacoId) { return this._api.getOrariByFarmaco(farmacoId); }
  addOrario(o) { return this._api.addOrario(o); }
  updateOrario(id, patch) { return this._api.updateOrario(id, patch); }
  deleteOrario(id) { return this._api.deleteOrario(id); }
  replaceOrariForFarmaco(farmacoId, orari) { return this._api.replaceOrariForFarmaco(farmacoId, orari); }
  getLogByData(data) { return this._api.getLogByData(data); }
  getLogByFarmacoData(farmacoId, data) { return this._api.getLogByFarmacoData(farmacoId, data); }
  getLogByDataStato(data, stato) { return this._api.getLogByDataStato(data, stato); }
  addLog(l) { return this._api.addLog(l); }
  updateLog(id, patch) { return this._api.updateLog(id, patch); }
  deleteLog(id) { return this._api.deleteLog(id); }
  upsertLog(farmacoId, data, doseNumero, patch) { return this._api.upsertLog(farmacoId, data, doseNumero, patch); }
  withTransaction(mode, storeNames, fn) { return this._api.withTransaction(mode, storeNames, fn); }

  // ==========================================================
  // Write-path guard (CS-4 S2c-2b, Spec 14.3 / 14.4.4 / 14.6.2)
  // ==========================================================
  // TACCUINO-PRIMA ANCHE ONLINE (14.6.2): a gesture is first annotated in
  // the local ledger AND in the outbox, in ONE transaction, and only then
  // delivered. No tap ever lives in volatile memory alone, so the windows
  // "response lost" and "crash before enqueue" cannot exist (M1/M2).

  async upsertLogsBatch(logs, op = null) {
    // SENTINEL_S2C2B_UPSERT_OVERRIDE
    if (!logs || logs.length === 0) return [];

    const elements = splitIntoElements({ op, logs });

    // INVARIANTE TOCCO INDIVISIBILE (14.3): ledger rows and queue elements
    // commit together or not at all. `_local.withTransaction` is called
    // EXPLICITLY: the same-named forwarder of this class goes to `_api`,
    // whose implementation ignores storeNames and has NO real rollback.
    // The nested `_local.upsertLogsBatch` opens `rw` on log_assunzioni
    // only -- a subset of this scope, hence a legal sub-transaction (WP5)
    // -- and `_wrap` re-throws RepositoryError as-is, so an inner abort
    // crosses the parent scope instead of being swallowed (L3, measured).
    // SENTINEL_S2C2B_TOUCH_TX
    const written = await this._local.withTransaction(
      "rw",
      ["log_assunzioni", "outbox"],
      async () => {
        const rows = await this._local.upsertLogsBatch(logs);
        await this._local.outboxEnqueue(elements);
        return rows;
      }
    );

    // Past this line nothing may reject (Q-QUATER-5=A): the touch is
    // annotated, and an annotated touch is never rolled back by the UI
    // (14.5.4). Delivery outcomes are handled inside the drain, per 14.3.
    // SENTINEL_QLEVA_WRITEPATH_GATE_REMOVED
    // Q-LEVA-1=A: the gate `if (delivered > 0)` is GONE and the Chiusura
    // del giro now lives inside `_drainOutbox`, shared by both callers.
    // The window is no longer the rows of the GESTURE but those of the
    // elements that actually LEFT the queue -- a NARROWING, declared: a
    // row whose element is still queued keeps a live promise, so 14.4.4
    // shields it and rereading it would correct nothing.
    await this._drainOutbox();

    // s.6.265 (Q-TER-3=A): the return is what was really persisted
    // locally, invariant with respect to the network.
    return written;
  }

  /**
   * Drain the outbox FIFO, one delivery at a time (14.3, "fila indiana").
   * The queue stops ONLY on unreachable / 5xx / UNAUTHORIZED; a parked
   * element does NOT block it. Never throws: see Q-QUATER-5=A.
   *
   * @returns {Promise<number>} elements delivered in this pass
   */
  /**
   * PUBLIC drain entry point (Q-QSEPT-3=A / Q-QSEPT-5=A / Q-QSEPT-6=A).
   * Called by the trigger thunk of actions.js. NEVER throws.
   *
   * @returns {Promise<number>} elements delivered in this pass
   */
  async drainOutbox() {
    // SENTINEL_QOCT_PUBLIC_DRAIN
    if (this._draining) return 0;
    // Q-QSEPT-4=A / s.6.271: `navigator.onLine` is consulted INSIDE the
    // pass and suppresses THIS pass only. No `offline` listener and no
    // persistent stop -- Spec 14.2.3 prescribes one, and this is the
    // documented deviation. On iOS standalone the `online` event is not
    // guaranteed on return from suspension, so a stop raised by `offline`
    // could stay up forever and real doses would remain undelivered and
    // invisible until CS-5, which is M2.
    //
    // FAIL-SAFE: the flag is compared to `false`, so a missing navigator
    // property (undefined) PROCEEDS. Absence of information must never
    // suppress a delivery.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // SENTINEL_QZANCA_LATCH_SOPPRESSIONE
      // Q-ZAGARA-5=A -- ASYMMETRIC role: `navigator.onLine` may LIGHT
      // the latch and may NEVER extinguish it. `false` is a positive
      // claim of absence; `true` is not, which is the whole reason
      // s.6.271 exists.
      this._unreachable = true;
      return 0;
    }
    this._draining = true;
    try {
      return await this._drainOutbox();
    } finally {
      // Released in `finally` on purpose: `_drainOutbox` is written never
      // to throw, but a flag left raised by an unforeseen throw would
      // silence EVERY later trigger for the rest of the session (M2).
      this._draining = false;
    }
  }

  // SENTINEL_QTARGA_CONTA_AVVISI
  // Q-TARGA-2=B -- the seam through which the trigger-driven thunk learns
  // that a notice was written. The notice store notifies NOBODY (zero
  // listeners and zero subscribe, measured), so the plan-side reread
  // cannot be event-driven: the thunk compares the count ACROSS the pass.
  //
  // Seated on the CONCRETE class and NOT on IRepository, which never names
  // notices: the contract route would have landed on ApiRepository, which
  // is VIETATO. Italian name for coherence with the whole public surface
  // of avvisiStore.js (salvaAvviso, elencaAvvisi, rimuoviAvviso) -- a
  // deliberate, pre-existing derogation from the English-code rule.
  //
  // NEVER throws: `elencaAvvisi` returns [] when the store is unreachable
  // (avvisiStore.js :164-166), so the clinical clause of the thunk holds
  // here by construction. Callers must STILL guard the call, because
  // getRepository() hands out a bare LocalRepository when the API flag is
  // off (index.js :53-59) and that class does not carry this method.
  contaAvvisi() {
    return elencaAvvisi().length;
  }

  // SENTINEL_QZANCA_IS_UNREACHABLE
  // Q-ZANCA-4=A -- reader on the CONCRETE class, on the precedent of
  // `contaAvvisi` and NOT of `outboxCounts`. Synchronous and unable to
  // throw. Callers MUST still guard: getRepository() hands out a bare
  // LocalRepository when the API flag is off, and that class does not
  // carry this method. Absence hides NOTHING there -- with no server
  // there is no "senza collegamento" to report -- which is why the M2
  // argument of Q-RINTOCCO-2=A does not apply here. Returns `null`
  // until the first measure.
  isUnreachable() {
    return this._unreachable;
  }

  // SENTINEL_QTIRANTE_OUTBOX_COUNTS
  // Q-RINTOCCO-2=A -- IDENTICAL surface on both concrete classes, and NO
  // capability check anywhere. `LocalRepository.outboxCounts` :684 exists
  // already; this is its forwarder, so the state layer reads the queue
  // through whichever class the factory handed it (index.js :53-59).
  //
  // Precedent is Q-QSEPT-6=A (LocalRepository :722-732), NOT Q-TARGA-3=A.
  // There, absence of `contaAvvisi` means "no notice", which is the
  // pre-repair behaviour. Here absence would mean "empty parking lot while
  // elements ARE parked", and 14.5.1 makes `Da controllare: N` the one
  // state that asks for human hands. That is M2, so the surface must EXIST
  // on both classes instead of being probed for.
  //
  // NOT a forwarder in the sense of the block above: it delegates to
  // `_local`, not to `_api`, and `outboxCounts` is absent from
  // ApiRepository (measured). The completeness net at
  // SyncRepository.test.js :98-106 walks ApiRepository.prototype, so it
  // never sees this name and the count of 27 stays true.
  //
  // MAY REJECT, unlike `contaAvvisi` right above: `_wrap` (LocalRepository
  // :57-64) re-throws a classified RepositoryError. A caller must NEVER
  // read a rejection as zero -- see src/state/coda.js.
  async outboxCounts() {
    return this._local.outboxCounts();
  }

  async _drainOutbox() {
    // SENTINEL_QLEVA_CHIUSURA_GIRO
    // Chiusura del giro (Spec 14.3 :1115) in SEDE UNICA (Q-LEVA-1=A).
    // BOTH callers inherit it here -- the write-path above and the public
    // trigger drain -- so the clause can no longer hold on one path and be
    // missed on the other. That asymmetry is the whole reason the impegno
    // `chiusura-giro-condizionata` was opened (lezione 6.205, voce 125).
    //
    // ORDER IS LOAD-BEARING, not style: the reread runs AFTER the pass and
    // NEVER inside it. While an element is queued its rows are shielded by
    // 14.4.4, so a reread placed before the drop would hand back the very
    // row the shield rejected and correct NOTHING. The drop removes the
    // promise, the shield lifts, and only then does the server snapshot
    // reach the mirror. Pinned by `letturaAlDrop` in the specchio suite.
    //
    // COST AT EMPTY QUEUE IS ZERO: `touched` stays empty and
    // `_refreshTouchedWindow` returns on `dates.length === 0`. This is why
    // the reread can be unconditional without a per-pass price.
    const touched = [];
    const delivered = await this._drainOutboxPass(touched);
    await this._refreshTouchedWindow(touched);
    return delivered;
  }

  async _drainOutboxPass(touched) {
    // SENTINEL_S2C2B_FIFO_DELIVERY
    let delivered = 0;
    let lastId = null;
    // Q-SEX-4=A: null until an element is skipped; from then on the queue
    // advances PAST it instead of stopping the pass.
    let afterId = null;
    for (;;) {
      let element = null;
      try {
        element =
          afterId === null
            ? await this._local.outboxNextPending()
            : await this._local.outboxNextPendingAfter(afterId);
      } catch {
        return delivered; // local read failed: queue intact, retry at 14.2
      }
      if (!element) return delivered;
      // Safety net: each pass must remove or park the head, so the id must
      // change. A repeated head means no progress -- stop instead of
      // spinning; the element stays queued and nothing is lost (M2).
      if (element.id === lastId) return delivered;
      lastId = element.id;

      let outcome;
      try {
        outcome = await this._deliverElement(element);
      } catch {
        // INTERNAL class (Q-SEX-2=A): everything raised OUTSIDE the delivery
        // try, PLUS the no-`.code` throws re-thrown from inside it. One
        // handler for both, because outside the try nothing was ever sent,
        // so the population is local by construction.
        // SENTINEL_SEX_INTERNA_HANDLER
        try {
          outcome = await this._onInternalException(element);
        } catch {
          // Even the counter could not be written: Dexie itself is the
          // resource that failed. The element stays `pending` and nothing is
          // lost (M2). Parking would need the very same broken store, so no
          // other sede would make it reachable.
          return delivered;
        }
      }
      if (outcome === "halted") return delivered;
      // SENTINEL_QLEVA_TOUCHED_PUSH
      // Only an element that LEFT the queue feeds the window (Q-LEVA-1=A).
      // `parked` and `ritentabile` keep a LIVE promise, so 14.4.4 still
      // shields their rows and the mirror is ALREADY right: adding them
      // would buy a read and change nothing. `halted` cannot reach this
      // line -- the early return above already left the function, and the
      // queue was not walked, so Spec :1115 does not apply to that pass.
      if (outcome === "delivered" || outcome === "refused") {
        for (const riga of element.logs || []) touched.push(riga);
      }
      if (outcome === "delivered") delivered += 1;
      if (outcome === "ritentabile") afterId = element.id;
    }
  }

  /**
   * INTERNAL class handler (Q-SEX-2=A / Q-SEX-3=A / Q-SEX-4=A).
   * Counts one failed attempt on the element and parks it once the budget
   * is spent, so the queue is never blocked for good: a permanent stop
   * behind one element is the M2 mode Q-QQUIN-2=A rejected.
   *
   * @returns {Promise<"parked"|"ritentabile">}
   */
  async _onInternalException(element) {
    // SENTINEL_QOCT_ATTEMPT_GATE
    // Q-QSEPT-1=A / Q-QOCT-3=A. The budget is spent per ELEMENT, not per
    // pass. Without this gate three rapid taps on different doses run three
    // write-path passes in seconds, each charging one attempt to the SAME
    // head element, which parks a real dose as ERRORE_INTERNO_RIPETUTO with
    // no retry and no surface until CS-5.
    //
    // FAIL-SAFE, not negotiable: an absent, null or unparseable timestamp
    // makes Date.parse return NaN, and `NaN < X` is false, so the element
    // PROCEEDS and the attempt is charged. Suppressing a delivery on
    // missing information would be M2. Elements enqueued before this
    // release carry no timestamp and are therefore unaffected.
    const sinceLast = Date.now() - Date.parse(element.last_attempt_at);
    if (sinceLast < OUTBOX_ATTEMPT_GATE_MS) {
      // Too soon: do NOT charge the attempt. The element stays `pending`
      // and the caller advances the cursor past it (Q-SEX-4=A), so the
      // queue never stops behind it.
      return "ritentabile";
    }
    // SENTINEL_SEX_ONINTERNAL
    const next = (element.attempts || 0) + 1;
    await this._local.outboxBumpAttempts(element.id, next);
    if (next >= INTERNAL_MAX_ATTEMPTS) {
      await this._local.outboxPark(
        element.id,
        PARK_REASONS.ERRORE_INTERNO_RIPETUTO
      );
      return "parked";
    }
    return "ritentabile";
  }

  /**
   * Deliver ONE element. VERB-DRIVEN (Q-TER-1=A): the route is a function
   * of the derived verb, NEVER of `row.stato`. Measured: `stato` travels
   * on none of the five payloads, it only selects the branch, so forcing
   * it cannot falsify the record (M3).
   *
   * @returns {Promise<"delivered"|"parked"|"halted"|"refused"|"ritentabile">}
   *   `ritentabile` (decisione 2): delivered, but the notice the 2xx asked
   *   for could not be persisted -- the element stays pending, no attempt
   *   charged, redelivered at the next pass (dedup server side).
   */
  async _deliverElement(element) {
    const delivery = deriveDelivery(element);
    if (!delivery) {
      // R-4 PARK-ON-UNKNOWN: never guess a route.
      await this._local.outboxPark(
        element.id,
        PARK_REASONS.ROTTA_NON_DERIVABILE
      );
      return "parked";
    }
    const rows = delivery.rows || [];
    let risposta = null;
    try {
      if (delivery.method === "batch") {
        // Atomic couple (Q2.A): the copies keep `stato`, because
        // ApiRepository detects the couple by predicate. COPIES only --
        // the frozen logs are never mutated (M3).
        risposta = await this._api.upsertLogsBatch(
          rows.map((r) => ({ ...r, client_op_id: element.client_op_id }))
        );
      } else {
        const head = rows[0];
        const patch = this._patchForVerb(
          delivery.verb,
          head,
          element.client_op_id
        );
        if (!patch) {
          await this._local.outboxPark(
            element.id,
            PARK_REASONS.ROTTA_NON_DERIVABILE
          );
          return "parked";
        }
        risposta = await this._api.upsertLog(
          head.farmaco_id,
          head.data,
          head.dose_numero,
          patch
        );
      }
    } catch (err) {
      const code = err && err.code;

      // Q-SEX-2=A, POSITIONAL partition. No `.code` means the throw did not
      // come from transport but from the two pure-JS sites inside the try
      // (rows.map, _patchForVerb). That is the INTERNAL class, which Spec
      // 14.3 gives a counter: re-throw, so the drain handles it exactly like
      // everything raised outside the try. Parking it here was the
      // divergence that -sexies closes.
      // SENTINEL_SEX_RETHROW_NOCODE
      if (!code) throw err;
      // SENTINEL_QZANCA_LATCH_CONSEGNA
      // Q-OGIVA-3=A / Q-ZANCA-2=A -- ONE statement that lights AND
      // extinguishes, seated ABOVE the halting branch instead of
      // inside it. That branch carries TWO codes, and UNAUTHORIZED
      // proves the server ANSWERED: lighting on the branch itself
      // would leave the latch on with the phone online, which is the
      // taxonomy finding of R-2.
      this._unreachable = code === "DB_UNAVAILABLE";
      // Unreachable and 5xx both surface as DB_UNAVAILABLE (measured in
      // apiClient); together with UNAUTHORIZED they STOP the queue and
      // leave the element in it. Never parked: parking a true dose for
      // someone else's outage would expose it to the Elimina button.
      if (code === "DB_UNAVAILABLE" || code === "UNAUTHORIZED") {
        return "halted";
      }
      // s.6.266 (Q-QUATER-2=A): every business error PARKS, none drops.
      // Dropping a broken 4xx would lose a dose really taken (M2) and send
      // the card back to "da prendere" (M1); parking loses nothing, because
      // the parking lot never discards. The queue proceeds and the
      // protection stays ON (14.4.4). Spec 14.3 norms the ACTION, which is
      // UNCHANGED here -- every 4xx still parks. What changes is the LABEL.
      //
      // Q-QQUIN-2=A: the catch-all becomes FIVE outcomes. In the old form
      // ROTTA_NON_DERIVABILE carried TWO meanings -- the true one at :256
      // and :279, where no route could be derived BEFORE sending, and a
      // false one here, where the route was derived correctly and the
      // SERVER refused. The reason is what the person reads in the parking
      // lot (14.3), so the second label was a false explanation.
      // SENTINEL_S2C2B_CATCH_FIVE
      let reason;
      if (code === "CONFLICT") {
        // SENTINEL_S6273_DROP
        // s.6.273 EMESSA. Spec 14.3 :1102 contemplates TWO outcomes on
        // this row; this branch has THREE (Q-NODO-2=A, -3=A, -4=A).
        //
        // ORDER IS THE CLINICAL CLAUSE and not a style choice: the
        // notice is the M2 compensation for the drop, so it is
        // persisted BEFORE outboxRemove. The only window that can
        // open is "notice without drop", which is benign -- the
        // element stays queued, is redelivered, earns the same 409
        // and rewrites the SAME key, one per targa (Q-LETTO-4=A).
        // The reverse order loses the gesture.
        //
        // s.6.267 EXTINGUISHED here: its premise was that the 14.5
        // surface did not exist. CONFLITTO_VERO stays ACTIVE and does
        // NOT become historical -- the prediction written at its
        // emission assumed two outcomes (Registro voce 158).
        if (await this._avvisaSuConflitto(element, rows)) {
          // Outside a try, exactly like the normal drop at the tail
          // of this method: a failing outboxRemove propagates, spends
          // one attempt and leaves the element queued. Nothing lost.
          await this._local.outboxRemove(element.id);
          return "refused";
        }
        // No presa among the rows SENT, or the notice could not be
        // written: park, which is the pre-F2 behaviour and is safe.
        reason = PARK_REASONS.CONFLITTO_VERO;
      } else if (code === "CONSTRAINT_VIOLATION") {
        // 409 and 422 collapse here (apiClient :33-34, MEASURED). Against a
        // server without CONFLICT a true conflict lands here too: imprecise
        // label, identical action, zero clinical stake.
        reason = PARK_REASONS.RICHIESTA_ROTTA;
      } else if (code === "NOT_FOUND") {
        // Farmaco OR dose: the ownership check collapses missing /
        // other-user / inactive onto 404 by security-by-obscurity.
        reason = PARK_REASONS.FARMACO_O_DOSE_ASSENTE;
      } else {
        // GENERIC, plus any raw throw with no `.code` from inside the try
        // (:267 map, :271 _patchForVerb). The ROUTING of that second case is
        // NOT touched here: it still parks at once, without the N=3 of 14.3.
        // That deviation stays open and is the matter of -sexies. Only the
        // label changes, from a false one to a truthful one.
        reason = PARK_REASONS.ERRORE_NON_CLASSIFICATO;
      }
      await this._local.outboxPark(element.id, reason);
      return "parked";
    }
    // SENTINEL_D2_AVVISO_INTERVALLO
    // Decisione 2. A 2xx on /presa may carry `avviso`: the presa IS
    // registered (M2 holds, nothing to roll back) but lies under the minimum
    // interval from another presa of the same farmaco, in real minutes
    // measured server side. The person must see it (Spec 14.5 p.4), so the
    // notice is persisted BEFORE the drop, in the order the conflict notice
    // already uses: if it cannot be written the element STAYS QUEUED and the
    // redelivery earns dedup:true with the avviso recomputed server side --
    // nothing lost, nothing doubled (targa). The batch answer of
    // ApiRepository is [presaRow, ricalcEcho]: the body is its first element.
    // `ritentabile` is the outcome that leaves the element pending without
    // charging an attempt: the server did not fail, the phone's store did.
    const corpo = Array.isArray(risposta) ? risposta[0] : risposta;
    if (corpo && corpo.avviso && typeof corpo.avviso === "object") {
      const scritto = await this._avvisaSuIntervalloMinimo(element, rows, corpo.avviso);
      if (!scritto) return "ritentabile";
    }
    await this._local.outboxRemove(element.id);
    return "delivered";
  }

  /**
   * Decisione 2 -- persist the "due dosi molto vicine" notice for a presa
   * the server registered with an `avviso`. NEVER throws, same clause and
   * same reason as _avvisaSuConflitto. `false` means the caller must NOT
   * drop the element yet.
   *
   * The time shown is the RECORDED dose time, read from the presa row that
   * was actually sent (M3: never the tap for a retroactive presa); the
   * numbers are the server's, in real minutes.
   *
   * @param {object} element the outbox element
   * @param {any[]} rows delivery.rows -- the rows actually SENT
   * @param {object} avviso the server `avviso` object
   * @returns {Promise<boolean>} true only if the notice reads back
   */
  async _avvisaSuIntervalloMinimo(element, rows, avviso) {
    const presa =
      Array.isArray(rows) ? rows.find((r) => r && r.stato === "presa") : null;
    let farmaco = null;
    try {
      farmaco = await this._local.getFarmaco(element.farmaco_id);
    } catch {
      return false;
    }
    if (!farmaco || typeof farmaco.nome !== "string") return false;

    return salvaAvviso({
      client_op_id: element.client_op_id,
      farmaco_nome: farmaco.nome,
      dose_numero: element.dose_numero,
      data: element.data,
      ora_tocco: element.created_at,
      op: element.op,
      motivo: MOTIVI_AVVISO.INTERVALLO_MINIMO,
      dettagli: {
        lato: avviso.lato,
        minuti_dalla_vicina: avviso.minuti_dalla_vicina,
        intervallo_minimo_minuti: avviso.intervallo_minimo_minuti,
        ora_effettiva: presa ? (presa.ora_effettiva ?? null) : null,
        ora_effettiva_vicina: avviso.ora_effettiva_vicina ?? null,
      },
    });
  }

  /**
   * s.6.273 -- decide whether a true conflict may be DROPPED, and pay
   * for the drop with a durable notice (Q-NODO-2=A, Q-NODO-3=A).
   *
   * NEVER throws. A throw from here would leave the catch block of
   * _deliverElement, reach _drainOutbox and be routed to the INTERNAL
   * class, spending an attempt on an element that failed for a
   * business reason -- the outcome avvisiStore.js :22-27 calls wrong.
   *
   * `false` means the caller MUST NOT drop. Parking is the pre-F2
   * behaviour and is clinically safe: the lot never discards.
   *
   * SENTINEL_S6273_AVVISO
   *
   * @param {object} element the outbox element
   * @param {any[]} rows delivery.rows -- the rows actually SENT
   * @returns {Promise<boolean>} true only if the notice reads back
   */
  async _avvisaSuConflitto(element, rows) {
    // Q-NODO-3=A. The discriminant is the ROW and not the gesture:
    // for the annulla* verbs deriveDelivery :277 hands over the FIRST
    // row only and the others are protection-only (s.6.262). A card
    // composed on a row never sent would state something false, which
    // is M3. Measured: `stato: presa` has ONE production writer,
    // recalc.js :395.
    const contienePresa =
      Array.isArray(rows) && rows.some((r) => r && r.stato === "presa");
    if (!contienePresa) return false;

    // Q-NODO-2=A: the MIRROR and not the network. We are inside the
    // catch of a delivery that just failed; if the cause is the
    // network, a second network read fails with it and the notice
    // would never be written in the very scenario it exists for.
    // Read AFTER the discriminant, so the farmaco is fetched only
    // when a drop is actually on the table.
    let farmaco = null;
    try {
      farmaco = await this._local.getFarmaco(element.farmaco_id);
    } catch {
      return false; // Q-LETTO-7=A: a failed read does NOT drop.
    }
    // A missing farmaco is a FAILED read, not an empty one.
    if (!farmaco || typeof farmaco.nome !== "string") return false;

    // The seven facts are ALL element fields (Q-NODO-3=A) except the
    // name, denormalised here at drop time (Q-LETTO-4=A). salvaAvviso
    // validates every one and returns false on any gap, so a
    // malformed element PARKS instead of dropping.
    return salvaAvviso({
      client_op_id: element.client_op_id,
      farmaco_nome: farmaco.nome,
      dose_numero: element.dose_numero,
      data: element.data,
      ora_tocco: element.created_at,
      op: element.op,
      motivo: MOTIVI_AVVISO.CONFLITTO,
    });
  }

  /**
   * Build the ApiRepository patch that FORCES the branch of `verb`.
   * Returns null when the verb has no branch: the caller parks (R-4).
   */
  _patchForVerb(verb, row, targa) {
    const { stato: _dropStato, ...bare } = row;
    const stamped = { ...bare, client_op_id: targa };
    if (verb === "presa") return { ...stamped, stato: "presa" };
    if (verb === "saltata") return { ...stamped, stato: "saltata" };
    if (verb === "sospesa") return { ...stamped, stato: "sospesa" };
    // 'prevista' and 'ricalcolata' select the same /log/undo branch and
    // neither is transmitted: the literal is a branch selector only.
    if (verb === "undo") return { ...stamped, stato: "prevista" };
    // recupero: NO `stato` at all. The guard discriminates by PRESENCE and
    // TYPE of recupero_minuti (s.6.264). This is what extinguishes #18-L1:
    // the recupero row carries stato='ricalcolata' and would otherwise
    // reach /log/undo, losing the recalculation of dose N+1 (M1).
    if (verb === "recupero") return stamped;
    return null;
  }

  /**
   * Chiusura del giro (14.3): re-read the plan window covering the rows
   * just touched, to realign the mirror. ADVISORY -- it goes through the
   * guard (mirror + freshness + shield) and its failure can NEVER fail a
   * touch that is already annotated (Q-QUATER-4=A, Q-QUATER-5=A).
   */
  async _refreshTouchedWindow(logs) {
    const dates = logs
      .map((l) => l && l.data)
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return;
    try {
      await this.getLogByRange(dates[0], dates[dates.length - 1]);
    } catch {
      // advisory only
    }
  }
}
