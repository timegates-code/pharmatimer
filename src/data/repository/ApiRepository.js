// src/data/repository/ApiRepository.js
//
// SENTINEL_N5I_CP1_PRE_APPLIED -- do not remove (idempotency_marker pattern par.22.58-Fase2 + Lesson #20)
//
// Hybrid implementation of IRepository (Fase 3 F3-S5-alpha, par.11.N-S3 N+5.I).
//
// Architecture (Strada B ratificata par.22.89 Q-RATIFICA-STRATEGICA-2=a +
// composition pattern Lesson #28 candidate par.22.90):
//  - Owns private LocalRepository instance for delegate methods (composition).
//  - 11 delegate: 7 Profili + 3 Setting + 1 inherently-local
//    (setProfiloAttivoConCleanup -> log cleanup local-only, EMP-15 par.22.90).
//  - 17 API-routed via apiClient: Farmaci (5) + Orari (6) + Log (6).
//  - 1 orchestration: withTransaction (best-effort, no real rollback).
//  - 2 throw GENERIC: updateLog + deleteLog (sub-AMB N + O par.22.90).
//
// State-machine dispatch (sub-AMB A par.22.90):
//   upsertLog(fid, data, dn, patch) -> _dispatchLogVerb(patch.stato | recupero)
//     'presa'                  -> POST /log/presa
//     'saltata'                -> POST /log/saltata
//     'sospesa'                -> POST /log/sospesa
//     'prevista'|'ricalcolata' -> POST /log/undo
//     recupero > 0 && !stato   -> POST /log/recupero
//     otherwise                -> throw RepositoryError(GENERIC)
//
// Batch atomic detect (sub-AMB J par.22.90):
//   upsertLogsBatch([{presa @ D}, {ricalcolata @ D+1}]) -> 1 POST /log/presa atomic
//     (with ricalcolo_dose_successiva nested payload)
//   otherwise: sequential N upsertLog calls.
//
// Fan-out (sub-AMB B par.22.90):
//   getLogByRange + getAllOrari -> Promise.all fail-fast on first reject.
//
// Error contract (RepositoryError vocabulary par.22.34-Fase2 + N+5.I MOD enum):
//   apiClient maps HTTP -> RepositoryError. ApiRepository propagates without
//   re-wrapping (apiClient already throws RepositoryError, idempotent).
//
// Shape asymmetries (EMP-4/14/15/16/17/18/19/20/21 par.22.90/91):
//   - attivo/demo: 0/1 PWA <-> bool backend (handled in _fromApi/_toApiFarmaco)
//   - intervallo_ore Decimal-string backend -> number PWA
//   - ora_effettiva HH:MM PWA -> ISO datetime backend (handled in _toApiPresaPayload)
//   - getFarmaco(id) returns null on soft-deleted (backend filter attivo=TRUE, EMP-19)
//
// @implements {IRepository}

import { LocalRepository } from "./LocalRepository.js";
import { apiClient } from "./apiClient.js";
import { RepositoryError } from "./RepositoryError.js";

export class ApiRepository {
  /**
   * @param {LocalRepository} [_local] — injectable per test (composition).
   */
  constructor(_local = null) {
    this._local = _local ?? new LocalRepository();
  }

  // ==========================================================
  // Profili (7 delegate LocalRepository)
  // ==========================================================
  getProfili() { return this._local.getProfili(); }
  getProfiloAttivo() { return this._local.getProfiloAttivo(); }
  addProfilo(p) { return this._local.addProfilo(p); }
  updateProfilo(id, patch) { return this._local.updateProfilo(id, patch); }
  deleteProfilo(id) { return this._local.deleteProfilo(id); }
  setProfiloAttivo(id) { return this._local.setProfiloAttivo(id); }
  setProfiloAttivoConCleanup(profiloId, logsToDelete) {
    // sub-AMB K + EMP-15 par.22.90: log cleanup local-only, NO backend sync.
    // Acceptable dogfooding single-user F3-S5-alpha.
    return this._local.setProfiloAttivoConCleanup(profiloId, logsToDelete);
  }

  // ==========================================================
  // Impostazioni (3 delegate LocalRepository, Setting PWA-only)
  // ==========================================================
  getSetting(chiave) { return this._local.getSetting(chiave); }
  setSetting(chiave, valore) { return this._local.setSetting(chiave, valore); }
  getAllSettings() { return this._local.getAllSettings(); }

  // ==========================================================
  // Farmaci (5 API-routed)
  // ==========================================================
  async getFarmaci(_opts = {}) {
    // EMP-19 par.22.91: backend filters attivo=TRUE; opts.soloAttivi ignored.
    const data = await apiClient.get("/api/farmaci");
    return Array.isArray(data) ? data.map((f) => this._fromApiFarmaco(f)) : [];
  }

  async getFarmaco(id) {
    // sub-AMB F par.22.90 + EMP-14/19: backend no singular GET.
    // List+filter; null on miss (incl. soft-deleted -- asymmetry vs LocalRepository).
    const farmaci = await this.getFarmaci();
    return farmaci.find((f) => f.id === id) || null;
  }

  async addFarmaco(f) {
    const payload = this._toApiFarmaco(f);
    const result = await apiClient.post("/api/farmaci", payload);
    return result && typeof result.id === "number" ? result.id : undefined;
  }

  async updateFarmaco(id, patch) {
    // sub-AMB I-bis par.22.90 + EMP-20 par.22.91: PUT full-replace RFC 7231.
    // 2-step fetch+merge+PUT.
    const current = await this.getFarmaco(id);
    if (!current) {
      throw new RepositoryError({
        code: "NOT_FOUND",
        message: `Farmaco ${id} non trovato`,
      });
    }
    const merged = { ...current, ...patch };
    const payload = this._toApiFarmaco(merged);
    await apiClient.put(`/api/farmaci/${id}`, payload);
  }

  async deleteFarmaco(id) {
    // Soft-delete server-side (attivo=FALSE), 204 No Content.
    await apiClient.delete(`/api/farmaci/${id}`);
  }

  // ==========================================================
  // Orari (6 API-routed via nested + bulk-replace)
  // ==========================================================
  async getOrariByFarmaco(farmacoId) {
    const data = await apiClient.get(`/api/farmaci/${farmacoId}/orari`);
    return Array.isArray(data) ? data : [];
  }

  async getAllOrari() {
    // sub-AMB B par.22.90 fan-out: 1+N (getFarmaci + per-farmaco orari).
    // Promise.all fail-fast on first reject.
    const farmaci = await this.getFarmaci();
    const arrays = await Promise.all(
      farmaci.map((f) => this.getOrariByFarmaco(f.id))
    );
    return arrays.flat();
  }

  async addOrario(o) {
    // sub-AMB G par.22.90: backend no singular add. Fetch+append+PUT bulk,
    // then refetch to recover server-assigned id (univocity by dose_numero).
    const current = await this.getOrariByFarmaco(o.farmaco_id);
    const next = [...current, this._stripOrarioServerFields(o)];
    await this.replaceOrariForFarmaco(o.farmaco_id, next);
    const after = await this.getOrariByFarmaco(o.farmaco_id);
    const added = after.find((x) => x.dose_numero === o.dose_numero);
    return added ? added.id : undefined;
  }

  async updateOrario(id, patch) {
    // sub-AMB G par.22.90: cross-farmaco lookup via getAllOrari + bulk PUT.
    const all = await this.getAllOrari();
    const target = all.find((o) => o.id === id);
    if (!target) {
      throw new RepositoryError({
        code: "NOT_FOUND",
        message: `Orario ${id} non trovato`,
      });
    }
    const next = all
      .filter((o) => o.farmaco_id === target.farmaco_id)
      .map((o) =>
        o.id === id
          ? this._stripOrarioServerFields({ ...o, ...patch })
          : this._stripOrarioServerFields(o)
      );
    await this.replaceOrariForFarmaco(target.farmaco_id, next);
  }

  async deleteOrario(id) {
    // sub-AMB G par.22.90: fetch all, filter out, bulk PUT.
    const all = await this.getAllOrari();
    const target = all.find((o) => o.id === id);
    if (!target) {
      throw new RepositoryError({
        code: "NOT_FOUND",
        message: `Orario ${id} non trovato`,
      });
    }
    const next = all
      .filter((o) => o.farmaco_id === target.farmaco_id && o.id !== id)
      .map((o) => this._stripOrarioServerFields(o));
    await this.replaceOrariForFarmaco(target.farmaco_id, next);
  }

  async replaceOrariForFarmaco(farmacoId, orari) {
    // OrariBulkPayload (RootModel[list[OrarioCreate]]): strip server-managed fields.
    const payload = orari.map((o) => this._stripOrarioServerFields(o));
    await apiClient.put(`/api/farmaci/${farmacoId}/orari`, payload);
  }

  // ==========================================================
  // Log assunzioni (9: 6 API + 1 dispatch + 2 throw)
  // ==========================================================
  async getLogByData(data) {
    // sub-AMB C par.22.90: alias for getLogByRange(d, d).
    return this.getLogByRange(data, data);
  }

  async getLogByRange(dataDa, dataA) {
    // sub-AMB B par.22.90 fan-out: 1+N (getFarmaci + per-farmaco log).
    const farmaci = await this.getFarmaci();
    const arrays = await Promise.all(
      farmaci.map((f) =>
        apiClient.get(
          `/api/farmaci/${f.id}/log?data_from=${dataDa}&data_to=${dataA}`
        )
      )
    );
    return arrays.flat();
  }

  async getLogByFarmacoData(farmacoId, data) {
    // sub-AMB D par.22.90: direct single-farmaco fetch.
    const rows = await apiClient.get(
      `/api/farmaci/${farmacoId}/log?data_from=${data}&data_to=${data}`
    );
    return Array.isArray(rows) ? rows : [];
  }

  async getLogByDataStato(data, stato) {
    // sub-AMB E par.22.90: fan-out + JS filter + sort by ora_effettiva ASC.
    // Matches LocalRepository.js semantics (null at end).
    const rows = await this.getLogByData(data);
    const filtered = rows.filter((r) => r.stato === stato);
    return filtered.sort((a, b) => {
      if (a.ora_effettiva == null && b.ora_effettiva == null) return 0;
      if (a.ora_effettiva == null) return 1;
      if (b.ora_effettiva == null) return -1;
      if (a.ora_effettiva < b.ora_effettiva) return -1;
      if (a.ora_effettiva > b.ora_effettiva) return 1;
      return 0;
    });
  }

  async addLog(l) {
    // Fallback via upsertLog dispatch (par.22.90 contract mapping).
    const result = await this.upsertLog(l.farmaco_id, l.data, l.dose_numero, l);
    return result && typeof result.id === "number" ? result.id : undefined;
  }

  async updateLog(_id, _patch) {
    // sub-AMB N par.22.90: throw GENERIC, no API endpoint.
    throw new RepositoryError({
      code: "GENERIC",
      message:
        "updateLog non supportato in API mode. Usa upsertLog (state-machine dispatch).",
    });
  }

  async deleteLog(_id) {
    // sub-AMB O par.22.90: throw GENERIC, backend no DELETE /log/{id}.
    throw new RepositoryError({
      code: "GENERIC",
      message:
        "deleteLog non supportato in API mode. Backend non espone endpoint dedicato.",
    });
  }

  async upsertLog(farmacoId, data, doseNumero, patch) {
    // sub-AMB A par.22.90: state-machine dispatch 5 verbi.
    return this._dispatchLogVerb(farmacoId, data, doseNumero, patch);
  }

  async upsertLogsBatch(logs) {
    // sub-AMB J par.22.90: atomic detect [presa @ D, ricalcolata @ D+1].
    if (!logs || logs.length === 0) return [];
    if (this._isAtomicPresaPlusRicalc(logs)) {
      return this._upsertLogsBatchAtomic(logs);
    }
    // Otherwise N sequential upsertLog calls (fail-fast).
    const results = [];
    for (const l of logs) {
      const r = await this.upsertLog(l.farmaco_id, l.data, l.dose_numero, l);
      results.push(r);
    }
    return results;
  }

  // ==========================================================
  // Transactions (1 orchestration best-effort)
  // ==========================================================
  async withTransaction(_mode, _storeNames, fn) {
    // sub-AMB H par.22.90: client-side wrap; storeNames ignored; no real rollback.
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError({
        code: "TRANSACTION_ABORT",
        message:
          "Transazione fallita (API mode best-effort, rollback non garantito multi-call)",
        cause: err,
      });
    }
  }

  // ==========================================================
  // Private dispatch helpers
  // ==========================================================

  _dispatchLogVerb(farmacoId, data, doseNumero, patch) {
    const stato = patch && patch.stato;
    if (stato === "presa") {
      const payload = this._toApiPresaPayload(data, doseNumero, patch);
      return apiClient.post(`/api/farmaci/${farmacoId}/log/presa`, payload);
    }
    if (stato === "saltata") {
      return apiClient.post(`/api/farmaci/${farmacoId}/log/saltata`, {
        data,
        dose_numero: doseNumero,
        ora_prevista: patch.ora_prevista,
        note: patch.note ?? null,
      });
    }
    if (stato === "sospesa") {
      return apiClient.post(`/api/farmaci/${farmacoId}/log/sospesa`, {
        data,
        dose_numero: doseNumero,
        ora_prevista: patch.ora_prevista,
        note: patch.note ?? null,
      });
    }
    if (stato === "prevista" || stato === "ricalcolata") {
      // sub-A.1 par.22.90 + sub-AMB N+5.I.E CP0 verde (zero match grep):
      // caller never sets forward 'ricalcolata' via upsertLog singolo.
      // Both 'prevista' and 'ricalcolata' interpreted as UNDO.
      return apiClient.post(`/api/farmaci/${farmacoId}/log/undo`, {
        data,
        dose_numero: doseNumero,
      });
    }
    if (!stato && patch && patch.recupero_minuti > 0) {
      return apiClient.post(`/api/farmaci/${farmacoId}/log/recupero`, {
        data,
        dose_numero: doseNumero,
        recupero_minuti: patch.recupero_minuti,
      });
    }
    throw new RepositoryError({
      code: "GENERIC",
      message:
        `upsertLog patch shape non riconosciuto ` +
        `(stato='${stato}', recupero_minuti=${patch && patch.recupero_minuti})`,
    });
  }

  _isAtomicPresaPlusRicalc(logs) {
    if (logs.length !== 2) return false;
    const [first, second] = logs;
    return (
      first &&
      second &&
      first.stato === "presa" &&
      second.stato === "ricalcolata" &&
      first.farmaco_id === second.farmaco_id
    );
  }

  async _upsertLogsBatchAtomic(logs) {
    const [presa, ricalc] = logs;
    const payload = this._toApiPresaPayload(presa.data, presa.dose_numero, presa);
    payload.ricalcolo_dose_successiva = {
      dose_numero: ricalc.dose_numero,
      data: ricalc.data,
      ora_prevista: ricalc.ora_prevista,
      ora_ricalcolata: ricalc.ora_ricalcolata,
      gap_minuti: ricalc.gap_minuti ?? 0,
    };
    const result = await apiClient.post(
      `/api/farmaci/${presa.farmaco_id}/log/presa`,
      payload
    );
    // Backend returns only /presa row; D+1 ricalc echoed from input (best-effort).
    // Consumer applyHelper.js:120 does not depend on D+1 id post-call.
    return [result, { ...ricalc }];
  }

  _toApiPresaPayload(data, doseNumero, patch) {
    // EMP-21 par.22.91: ora_effettiva may be 'HH:MM' (PWA legacy) or ISO datetime.
    // Backend (LogAssunzioneCreatePresa) expects datetime. Combine if HH:MM.
    let oraEff = patch.ora_effettiva;
    if (typeof oraEff === "string" && /^\d{2}:\d{2}$/.test(oraEff)) {
      oraEff = `${data}T${oraEff}:00`;
    }
    return {
      data,
      dose_numero: doseNumero,
      ora_prevista: patch.ora_prevista,
      ora_effettiva: oraEff,
      delta_minuti: patch.delta_minuti ?? 0,
      gap_minuti: patch.gap_minuti ?? 0,
      recupero_minuti: patch.recupero_minuti ?? 0,
      note: patch.note ?? null,
    };
  }

  // ==========================================================
  // Private mappers (shape PWA <-> backend)
  // ==========================================================

  _fromApiFarmaco(f) {
    // EMP-4 par.22.90: bool -> 0/1, Decimal-string -> number.
    if (!f) return f;
    return {
      ...f,
      attivo: f.attivo ? 1 : 0,
      demo: f.demo ? 1 : 0,
      intervallo_ore:
        f.intervallo_ore != null ? Number(f.intervallo_ore) : null,
      intervallo_minimo_ore:
        f.intervallo_minimo_ore != null
          ? Number(f.intervallo_minimo_ore)
          : null,
    };
  }

  _toApiFarmaco(f) {
    // EMP-4 par.22.90: 0/1 -> bool. Strip server-managed fields.
    // Number passthrough for intervallo (FastAPI Decimal accepts JSON number).
    const {
      id: _id,
      utente_id: _uid,
      created_at: _ca,
      updated_at: _ua,
      ...rest
    } = f;
    return {
      ...rest,
      attivo: !!f.attivo,
      demo: !!f.demo,
    };
  }

  _stripOrarioServerFields(o) {
    // OrariBulkPayload.OrarioCreate excludes id/utente_id/farmaco_id (server-injected).
    const { id: _id, utente_id: _uid, farmaco_id: _fid, ...rest } = o;
    return rest;
  }
}
