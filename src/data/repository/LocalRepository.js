import { db } from "../db.js";
import {
  RepositoryError,
  wrapRepoError,
  classifyRawError,
} from "./RepositoryError.js";

// ============================================================
// LocalRepository — IndexedDB (Dexie) implementation of IRepository.
// See ./IRepository.js for the full contract and entity typedefs.
// ============================================================
//
// Design notes:
// - All methods are async and return plain objects / arrays.
// - Updates use `patch` (partial object) style; fields not in the
//   patch are untouched.
// - Transactions are used where multiple tables or multiple rows
//   must change atomically (setProfiloAttivo, replaceOrariForFarmaco,
//   deleteFarmaco with cascade).
// - `deleteFarmaco` does NOT hard-delete: it sets attivo=0 to preserve
//   historical log entries (soft delete, as per spec section 9 note on
//   DELETE /api/farmaci/{id}).
// - `upsertLog` is the main write path for dose state changes: it
//   finds or creates a log row for (farmaco_id, data, dose_numero)
//   and merges the patch. This is how the reducer records PRESO /
//   SALTATA / SOSPESA / gap updates.
//
// Error handling (CP1a Step 11-A, AMB-11.A.1/2):
// - Every async method is wrapped via `_wrap` which converts raw
//   Dexie / IndexedDB errors into a typed `RepositoryError`. The
//   raw error is preserved as `cause` for debugging.
// - Code classification follows `classifyRawError` heuristic
//   (Dexie error name → code) unless an explicit `codeOverride`
//   is passed (used for transactional methods where the meaningful
//   failure mode is TRANSACTION_ABORT regardless of inner cause).
// - Business-rule violations (e.g. deleting the active profile)
//   throw `RepositoryError` directly; `_wrap` is idempotent on
//   already-wrapped errors so they propagate unchanged.

export class LocalRepository {

  // ==========================================================
  // Internal: error-wrapping helper (CP1a Step 11-A, AMB-11.A.1)
  // ==========================================================

  /**
   * Run an async operation and convert any thrown raw error into a
   * `RepositoryError`. RepositoryError instances thrown from inside
   * `fn` (e.g. business-rule violations) are propagated unchanged.
   *
   * @template T
   * @param {() => Promise<T>} fn
   * @param {string|null} [codeOverride] — force a specific code
   *        (used by transactional methods to surface TRANSACTION_ABORT).
   * @returns {Promise<T>}
   */
  async _wrap(fn, codeOverride = null) {
    try {
      return await fn();
    } catch (rawErr) {
      if (rawErr instanceof RepositoryError) throw rawErr;
      const code = codeOverride ?? classifyRawError(rawErr);
      throw wrapRepoError(rawErr, code);
    }
  }

  // ==========================================================
  // Profili
  // ==========================================================

  async getProfili() {
    return this._wrap(() => db.profilo_utente.orderBy("id").toArray());
  }

  async getProfiloAttivo() {
    return this._wrap(async () => {
      // attivo is stored as 0/1 (IndexedDB cannot index booleans)
      return (await db.profilo_utente.where("attivo").equals(1).first()) || null;
    });
  }

  async addProfilo(p) {
    return this._wrap(() =>
      db.profilo_utente.add({ ...p, attivo: p.attivo ? 1 : 0 })
    );
  }

  async updateProfilo(id, patch) {
    return this._wrap(async () => {
      const clean = { ...patch };
      if ("attivo" in clean) clean.attivo = clean.attivo ? 1 : 0;
      await db.profilo_utente.update(id, clean);
    });
  }

  async deleteProfilo(id) {
    // Refuse to delete the currently active profile — caller must
    // activate another one first. Keeps the invariant "exactly one
    // active profile" easy to maintain.
    //
    // Business-rule violation surfaces as CONSTRAINT_VIOLATION with
    // severity='warning' (recoverable: user activates another profile
    // and retries). _wrap idempotency lets this RepositoryError
    // propagate unchanged.
    return this._wrap(async () => {
      const p = await db.profilo_utente.get(id);
      if (p && p.attivo === 1) {
        throw new RepositoryError({
          code: "CONSTRAINT_VIOLATION",
          severity: "warning",
          message:
            "Non si può eliminare il profilo attivo. Attivane un altro prima.",
        });
      }
      await db.profilo_utente.delete(id);
    });
  }

  async setProfiloAttivo(id) {
    // Clear current active, set new one — in one transaction.
    // codeOverride: TRANSACTION_ABORT for transactional failures.
    return this._wrap(
      () =>
        db.transaction("rw", db.profilo_utente, async () => {
          const current = await db.profilo_utente
            .where("attivo")
            .equals(1)
            .toArray();
          for (const p of current) {
            if (p.id !== id) {
              await db.profilo_utente.update(p.id, { attivo: 0 });
            }
          }
          await db.profilo_utente.update(id, { attivo: 1 });
        }),
      "TRANSACTION_ABORT"
    );
  }

  async setProfiloAttivoConCleanup(profiloId, logsToDelete) {
    // Atomic: (1) activate profile (deactivating others), (2) delete given logs.
    // Used by cambiaProfilo thunk (Sessione 5b) to clean up 'ricalcolata' logs
    // that lose meaning under a new profile. See Changelog Fase 2 §6.20.
    return this._wrap(
      () =>
        db.transaction(
          "rw",
          [db.profilo_utente, db.log_assunzioni],
          async () => {
            // 1. Activate target profile, deactivate others.
            const current = await db.profilo_utente
              .where("attivo")
              .equals(1)
              .toArray();
            for (const p of current) {
              if (p.id !== profiloId) {
                await db.profilo_utente.update(p.id, { attivo: 0 });
              }
            }
            await db.profilo_utente.update(profiloId, { attivo: 1 });

            // 2. Delete the given log rows (find by composite key).
            for (const l of logsToDelete) {
              const rows = await db.log_assunzioni
                .where("[farmaco_id+data]")
                .equals([l.farmaco_id, l.data])
                .toArray();
              const toDel = rows.find((r) => r.dose_numero === l.dose_numero);
              if (toDel) {
                await db.log_assunzioni.delete(toDel.id);
              }
            }
          }
        ),
      "TRANSACTION_ABORT"
    );
  }

  // ==========================================================
  // Farmaci
  // ==========================================================

  async getFarmaci(opts = {}) {
    return this._wrap(() => {
      if (opts.soloAttivi) {
        return db.farmaci.where("attivo").equals(1).toArray();
      }
      return db.farmaci.orderBy("id").toArray();
    });
  }

  async getFarmaco(id) {
    return this._wrap(async () => (await db.farmaci.get(id)) || null);
  }

  async addFarmaco(f) {
    return this._wrap(() => {
      const clean = { ...f, attivo: f.attivo === 0 ? 0 : 1 };
      return db.farmaci.add(clean);
    });
  }

  async updateFarmaco(id, patch) {
    return this._wrap(async () => {
      const clean = { ...patch };
      if ("attivo" in clean) clean.attivo = clean.attivo ? 1 : 0;
      await db.farmaci.update(id, clean);
    });
  }

  async deleteFarmaco(id) {
    // Soft delete: keep the row but set attivo=0.
    // This preserves log_assunzioni history. Hard-deletion of the
    // underlying row and its orari/log is only done via clearDemoData.
    return this._wrap(() => db.farmaci.update(id, { attivo: 0 }));
  }

  // ==========================================================
  // Orari base
  // ==========================================================

  async getOrariByFarmaco(farmacoId) {
    return this._wrap(() =>
      db.orari_base.where("farmaco_id").equals(farmacoId).sortBy("dose_numero")
    );
  }

  async getAllOrari() {
    return this._wrap(() => db.orari_base.orderBy("id").toArray());
  }

  async addOrario(o) {
    return this._wrap(() => db.orari_base.add({ ...o }));
  }

  async updateOrario(id, patch) {
    return this._wrap(() => db.orari_base.update(id, patch));
  }

  async deleteOrario(id) {
    return this._wrap(() => db.orari_base.delete(id));
  }

  async replaceOrariForFarmaco(farmacoId, orari) {
    // Atomic replacement: drop all current schedules for this med,
    // then insert the new set. Used when the user edits the schedule
    // of a medication in Config.
    return this._wrap(
      () =>
        db.transaction("rw", db.orari_base, async () => {
          await db.orari_base
            .where("farmaco_id")
            .equals(farmacoId)
            .delete();
          if (orari.length > 0) {
            await db.orari_base.bulkAdd(
              orari.map((o) => ({ ...o, farmaco_id: farmacoId }))
            );
          }
        }),
      "TRANSACTION_ABORT"
    );
  }

  // ==========================================================
  // Log assunzioni
  // ==========================================================

  async getLogByData(data) {
    return this._wrap(() =>
      db.log_assunzioni.where("data").equals(data).toArray()
    );
  }

  async getLogByRange(dataDa, dataA) {
    return this._wrap(() =>
      db.log_assunzioni.where("data").between(dataDa, dataA, true, true).toArray()
    );
  }

  async getLogByFarmacoData(farmacoId, data) {
    return this._wrap(() =>
      db.log_assunzioni
        .where("[farmaco_id+data]")
        .equals([farmacoId, data])
        .sortBy("dose_numero")
    );
  }

  async getLogByDataStato(data, stato) {
    // Introduced in Sessione 7d-2 CP1 (§6.40 / AMB-7d-2.C, rectified to
    // singular naming D-R2 to match getLogByData / getLogByRange /
    // getLogByFarmacoData family).
    //
    // Primary consumer: actions.init() populates state.presoStack with the
    // keys of all logs in stato='presa' for the current dateStr, so that
    // a page reload preserves the UNDO direct window (§6.40).
    //
    // Strategy: leverage the "data" single-column index (cheap range
    // lookup), then filter and sort JS-side. A compound [data+stato]
    // index would be marginally faster but adds schema weight for one
    // call-site; filter-in-memory is acceptable given typical row count
    // (~dozens of logs per day).
    //
    // Sort key: ora_effettiva ASC. For stato='presa' this field is always
    // populated by applyAssunzione, so the null-handling below is purely
    // defensive (enables future callers passing other stato values).
    return this._wrap(async () => {
      const rows = await db.log_assunzioni.where("data").equals(data).toArray();
      const filtered = rows.filter((r) => r.stato === stato);
      return filtered.sort((a, b) => {
        if (a.ora_effettiva == null && b.ora_effettiva == null) return 0;
        if (a.ora_effettiva == null) return 1;
        if (b.ora_effettiva == null) return -1;
        if (a.ora_effettiva < b.ora_effettiva) return -1;
        if (a.ora_effettiva > b.ora_effettiva) return 1;
        return 0;
      });
    });
  }

  async addLog(l) {
    return this._wrap(() => db.log_assunzioni.add({ ...l }));
  }

  async updateLog(id, patch) {
    return this._wrap(() => db.log_assunzioni.update(id, patch));
  }

  async deleteLog(id) {
    return this._wrap(() => db.log_assunzioni.delete(id));
  }

  async upsertLog(farmacoId, data, doseNumero, patch) {
    // Find-or-create for the (farmaco, data, dose) tuple.
    // This is the primary write path for dose-state changes.
    return this._wrap(
      () =>
        db.transaction("rw", db.log_assunzioni, async () => {
          const rows = await db.log_assunzioni
            .where("[farmaco_id+data]")
            .equals([farmacoId, data])
            .toArray();
          const existing = rows.find((r) => r.dose_numero === doseNumero);

          if (existing) {
            await db.log_assunzioni.update(existing.id, patch);
            return { ...existing, ...patch };
          }

          const full = {
            farmaco_id: farmacoId,
            data,
            dose_numero: doseNumero,
            ora_prevista: patch.ora_prevista || null,
            ora_effettiva: null,
            delta_minuti: null,
            ora_ricalcolata: null,
            gap_minuti: 0,
            recupero_minuti: 0,
            stato: "prevista",
            note: null,
            ...patch,
          };
          const id = await db.log_assunzioni.add(full);
          return { ...full, id };
        }),
      "TRANSACTION_ABORT"
    );
  }

  async upsertLogsBatch(logs) {
    // Atomic batch upsert — all-or-nothing in a single IDB transaction.
    // Used by apply* thunks (Sessione 5b). See Changelog Fase 2 §6.22.
    if (!logs || logs.length === 0) return [];
    return this._wrap(
      () =>
        db.transaction("rw", db.log_assunzioni, async () => {
          const results = [];
          for (const log of logs) {
            const rows = await db.log_assunzioni
              .where("[farmaco_id+data]")
              .equals([log.farmaco_id, log.data])
              .toArray();
            const existing = rows.find((r) => r.dose_numero === log.dose_numero);

            if (existing) {
              const { id: _dropIncomingId, ...patch } = log;
              await db.log_assunzioni.update(existing.id, patch);
              results.push({ ...existing, ...patch });
            } else {
              const { id: _dropIncomingId, ...row } = log;
              const id = await db.log_assunzioni.add(row);
              results.push({ ...row, id });
            }
          }
          return results;
        }),
      "TRANSACTION_ABORT"
    );
  }

  // ==========================================================
  // Impostazioni
  // ==========================================================

  async getSetting(chiave) {
    return this._wrap(async () => {
      const row = await db.impostazioni_app.get(chiave);
      return row ? row.valore : undefined;
    });
  }

  async setSetting(chiave, valore) {
    return this._wrap(() => db.impostazioni_app.put({ chiave, valore }));
  }

  async getAllSettings() {
    return this._wrap(async () => {
      const rows = await db.impostazioni_app.toArray();
      return Object.fromEntries(rows.map((r) => [r.chiave, r.valore]));
    });
  }

  // ==========================================================
  // Transactions
  // ==========================================================

  // Generic atomic-scope helper. Consumers (thunks) pass store
  // NAMES (strings) for portability; this method resolves them
  // to Dexie Table objects via `db[name]` before delegating to
  // db.transaction. Rettifica F4 — Dexie 4 requires Table objs,
  // not strings (§6.64, Sessione 8 analisi-first v2.5.20).
  //
  // Error handling: Dexie already rolls the transaction back on
  // any thrown/rejected error inside `fn`. The rejection is
  // wrapped via `_wrap` with TRANSACTION_ABORT code; if `fn` itself
  // throws a RepositoryError (idempotency), it propagates unchanged.
  async withTransaction(mode, storeNames, fn) {
    return this._wrap(() => {
      const tables = storeNames.map((name) => db[name]);
      return db.transaction(mode, tables, fn);
    }, "TRANSACTION_ABORT");
  }
}
