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
//    (28 forwarders). A completeness vitest guards against surface drift.
//
// Freshness (Q4=A): owned here, persisted in localStorage under
// MIRROR_FRESHNESS_KEY (ISO-8601 UTC), bumped ONLY after a successful
// server read AND after the mirror-write. Persisted (not in-memory) so a
// cold offline boot can read it (Spec 14.4.6 / 14.5.3). Exposed via
// getMirrorFreshness() for CS-5.
//
// SENTINEL_PAR_22_198_QUINVICIES_SYNCREPO

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
      return data;
    } catch (err) {
      if (err && err.code === "DB_UNAVAILABLE") {
        return this._local.getLogByRange(dataDa, dataA);
      }
      throw err;
    }
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
  upsertLogsBatch(logs) { return this._api.upsertLogsBatch(logs); }
  withTransaction(mode, storeNames, fn) { return this._api.withTransaction(mode, storeNames, fn); }
}
