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

const MIRROR_FRESHNESS_KEY = "pharmatimer.mirrorFreshness";

export class SyncRepository {
  constructor(api, local) {
    this._api = api;
    this._local = local;
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

  // ---- Explicit forwarders (28) ----------------------------
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
    const delivered = await this._drainOutbox();
    if (delivered > 0) await this._refreshTouchedWindow(logs);

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
  async _drainOutbox() {
    // SENTINEL_S2C2B_FIFO_DELIVERY
    let delivered = 0;
    let lastId = null;
    for (;;) {
      let element = null;
      try {
        element = await this._local.outboxNextPending();
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
        // Internal app exception. The N=3 attempts + park of 14.3 are S3
        // (residuo verbalizzato a ter): today the element simply stays
        // queued, which is the safe direction.
        return delivered;
      }
      if (outcome === "halted") return delivered;
      if (outcome === "delivered") delivered += 1;
    }
  }

  /**
   * Deliver ONE element. VERB-DRIVEN (Q-TER-1=A): the route is a function
   * of the derived verb, NEVER of `row.stato`. Measured: `stato` travels
   * on none of the five payloads, it only selects the branch, so forcing
   * it cannot falsify the record (M3).
   *
   * @returns {Promise<"delivered"|"parked"|"halted">}
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
    try {
      if (delivery.method === "batch") {
        // Atomic couple (Q2.A): the copies keep `stato`, because
        // ApiRepository detects the couple by predicate. COPIES only --
        // the frozen logs are never mutated (M3).
        await this._api.upsertLogsBatch(
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
        await this._api.upsertLog(
          head.farmaco_id,
          head.data,
          head.dose_numero,
          patch
        );
      }
    } catch (err) {
      const code = err && err.code;
      // Unreachable and 5xx both surface as DB_UNAVAILABLE (measured in
      // apiClient); together with UNAUTHORIZED they STOP the queue and
      // leave the element in it. Never parked: parking a true dose for
      // someone else's outage would expose it to the Elimina button.
      if (code === "DB_UNAVAILABLE" || code === "UNAUTHORIZED") {
        return "halted";
      }
      // s.6.266 (Q-QUATER-2=A): every business error PARKS, none drops.
      // A true 409 and a broken 4xx both reach us as CONSTRAINT_VIOLATION
      // -- the server vocabulary has no conflict code and apiClient maps
      // 409 and 422 onto the same key (both MEASURED) -- while the two
      // rows of 14.3 they belong to demand opposite actions. Dropping a
      // broken 4xx would lose a dose really taken (M2) and send the card
      // back to "da prendere" (M1); parking a true 409 loses nothing,
      // because the parking lot never discards. The queue proceeds and the
      // protection stays ON (14.4.4).
      const reason =
        code === "GENERIC"
          ? PARK_REASONS.ROTTA_NON_DERIVABILE
          : PARK_REASONS.CONFLITTO_O_RICHIESTA_ROTTA;
      await this._local.outboxPark(element.id, reason);
      return "parked";
    }
    await this._local.outboxRemove(element.id);
    return "delivered";
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
