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

  // ==========================================================
  // Mirror write-path (CS-3, Spec 14.4)
  // SENTINEL_PAR_22_198_QUINVICIES_MIRROR_*
  // ==========================================================
  // Populate the local read-mirror from a fresh server snapshot.
  // Called by SyncRepository AFTER a successful server read, inside a
  // rw Dexie transaction. Reconciliation is soft-delete only (never
  // hard-delete), preserving clinical history (M2/M3, metro 14.0).

  async mirrorFarmaci(server) {
    // SENTINEL_PAR_22_198_QUINVICIES_MIRROR_FARMACI
    // Server returns only active meds (backend WHERE attivo=TRUE): any
    // local row absent from `server` is a soft-deleted med -> attivo=0,
    // NEVER hard-delete (preserves log history + name for Cronologia).
    const list = Array.isArray(server) ? server : [];
    return this._wrap(
      () =>
        db.transaction("rw", db.farmaci, async () => {
          const serverIds = new Set(list.map((f) => f.id));
          for (const f of list) {
            await db.farmaci.put({ ...f, attivo: f.attivo === 0 ? 0 : 1 });
          }
          const locals = await db.farmaci.toArray();
          for (const loc of locals) {
            if (!serverIds.has(loc.id) && loc.attivo !== 0) {
              await db.farmaci.update(loc.id, { attivo: 0 });
            }
          }
        }),
      "TRANSACTION_ABORT"
    );
  }

  async mirrorOrari(server) {
    // SENTINEL_PAR_22_198_QUINVICIES_MIRROR_ORARI
    // Full replace: the server publishes the authoritative orari view
    // (Q3=A). Orari of inactive meds are clinically inert.
    const list = Array.isArray(server) ? server : [];
    return this._wrap(
      () =>
        db.transaction("rw", db.orari_base, async () => {
          await db.orari_base.clear();
          if (list.length > 0) {
            await db.orari_base.bulkPut(list);
          }
        }),
      "TRANSACTION_ABORT"
    );
  }

  async mirrorLogWindow(server, dataDa, dataA) {
    // SENTINEL_PAR_22_198_QUINVICIES_MIRROR_LOGWINDOW
    // Windowed replace restricted to active meds (Q3=A). The server
    // response carries ONLY logs of active meds (fan-out over GET
    // /api/farmaci, WHERE attivo=TRUE), so the farmaco_id set present
    // in `server` == the active set for this window. Inside
    // [dataDa,dataA] we delete only rows whose farmaco_id is in that
    // set, then bulkPut the server rows. Out-of-window rows and
    // in-window rows of inactive meds stay INTACT (M2/M3).
    //
    // PINNED INVARIANT: the server never hard-deletes log rows (all 5
    // log verbs are INSERT/UPDATE only). If a server DELETE verb is
    // ever added, revisit this reconciliation -- the companion vitest
    // (LocalRepository.mirror.test.js) documents and guards it.
    const list = Array.isArray(server) ? server : [];
    return this._wrap(
      () =>
        db.transaction("rw", [db.log_assunzioni, db.outbox], async () => {
          // SENTINEL_S2C2B_MIRROR_SHIELD
          // Regola di protezione (Spec 14.4.4) -- CS-4/S2c-2b punto (f).
          // A dose key frozen inside a pending|parked outbox element is a
          // gesture the user already made and the server has not seen yet.
          // A server snapshot must NEVER overwrite it before delivery (M2)
          // and must never resurrect a stale value over it (M3).
          //
          // INDIVISIBLE: the outbox read happens INSIDE this transaction
          // (scope widened to two stores), so the shield cannot go stale
          // between the check and the write. `outboxProtectedKeys` opens a
          // nested "r" sub-transaction on `outbox`: both mode and scope are
          // subsets of this parent, which Dexie allows (WP5 GREEN).
          //
          // Shield applied to BOTH branches: a protected row is neither
          // deleted nor overwritten. With an empty outbox `protectedKeys`
          // is empty and the behaviour is byte-identical to CS-3.
          const protectedKeys = await this.outboxProtectedKeys();
          const doseKey = (r) => `${r.farmaco_id}|${r.data}|${r.dose_numero}`;
          const serverFarmIds = new Set(list.map((r) => r.farmaco_id));
          const inWindow = await db.log_assunzioni
            .where("data")
            .between(dataDa, dataA, true, true)
            .toArray();
          const toDelete = inWindow
            .filter((r) => serverFarmIds.has(r.farmaco_id))
            .filter((r) => !protectedKeys.has(doseKey(r)))
            .map((r) => r.id);
          if (toDelete.length > 0) {
            await db.log_assunzioni.bulkDelete(toDelete);
          }
          // SENTINEL_WP6_FIX_ID_SHIELD
          // WP6 fix (par.198-sextriginties, Q-FIX-1=A). The dose-key shield
          // above cannot see the PRIMARY-KEY space: local autoincrement ids
          // and server ids are independent sequences over the same integers
          // (probe WP6: measures a, c, d RED pre-fix). A server row whose id
          // equals the id of a SURVIVOR of this reconciliation -- a protected
          // row, an in-window row of an inactive med, or ANY out-of-window
          // row, protected ones included (protectedKeys covers them by key,
          // not by id, and inWindow never reads them) -- would be written
          // OVER that survivor by the PK upsert below (M1, M2, M3).
          // Shield: survivor ids are read AFTER the delete (index-only
          // primaryKeys), and each colliding server row is RE-KEYED into a
          // computed free range: base = max(surviving ids, incoming ids) + 1,
          // assigned sequentially. Deterministic and collision-free by
          // construction, one single write call; the IDB generator realigns
          // past any explicit key it sees. With zero collisions the written
          // set is identical to the pre-fix code. A re-keyed row is plain
          // unprotected mirror data: the next cycle replaces it, and once
          // its blocking survivor is gone it converges back to its server
          // id. Spec 14.4.4 (protected rows untouchable by any server
          // snapshot) and 14.4.3 (faithful snapshot, absences included)
          // both hold; cardinality per dose key stays one.
          const toPut = list.filter((r) => !protectedKeys.has(doseKey(r)));
          if (toPut.length > 0) {
            const survivorIds = new Set(
              await db.log_assunzioni.toCollection().primaryKeys()
            );
            let maxId = 0;
            for (const k of survivorIds) if (k > maxId) maxId = k;
            for (const r of toPut) if (r.id > maxId) maxId = r.id;
            let nextFree = maxId + 1;
            const shielded = toPut.map((r) =>
              survivorIds.has(r.id) ? { ...r, id: nextFree++ } : r
            );
            await db.log_assunzioni.bulkPut(shielded);
          }
        }),
      "TRANSACTION_ABORT"
    );
  }

  // ==========================================================
  // Outbox (offline write-path, CS-4 S2a) -- Spec sez. 14.
  // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX
  // ----------------------------------------------------------
  // Inert foundation: primitives over the Dexie `outbox` store
  // (db.js v5). No caller wires these yet (that is S2b/S3). FIFO
  // is the ++id primary key; `stato` (pending|parked) is indexed.
  // ==========================================================

  async outboxEnqueue(elements) {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_ENQUEUE
    // Append 1..N elements (bulkAdd). Composable inside an ambient
    // rw transaction (S2b enqueues in the SAME tx as the log rows,
    // so a gesture is all-or-nothing). Returns the assigned ids.
    return this._wrap(() => db.outbox.bulkAdd(elements, { allKeys: true }));
  }

  async outboxNextPending() {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_NEXTPENDING
    // First pending element by ascending id (true FIFO on the PK).
    return this._wrap(async () =>
      (await db.outbox
        .orderBy("id")
        .filter((e) => e.stato === "pending")
        .first()) || null
    );
  }

  async outboxRemove(id) {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_REMOVE
    return this._wrap(() => db.outbox.delete(id));
  }

  async outboxPark(id, reason) {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_PARK
    return this._wrap(() =>
      db.outbox.update(id, {
        stato: "parked",
        parked_reason: reason,
        parked_at: new Date().toISOString(),
      })
    );
  }

  async outboxRetry(id) {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_RETRY
    // parked -> pending at the SAME id: the element rejoins the FIFO
    // at its original position (gesture order preserved).
    return this._wrap(() =>
      db.outbox.update(id, {
        stato: "pending",
        parked_reason: null,
        parked_at: null,
        attempts: 0,
      })
    );
  }

  async outboxNextPendingAfter(afterId) {
    // SENTINEL_SEX_OUTBOX_NEXTAFTER
    // Same shape as outboxNextPending, but skips every id up to and
    // including `afterId`. Q-SEX-4=A: an element that raised an internal
    // exception and has not spent its budget stays `pending`, so the plain
    // head query would hand it back and the pass would end on the anti-spin
    // net. The cursor lets the queue proceed past it, as Spec 14.3 requires
    // (the fila indiana stops ONLY on unreachable / 5xx / UNAUTHORIZED).
    // Ordering dependencies on the same dose are resolved by server-wins
    // plus the final re-read, per Spec 14.3 -- NOT by preserving order here.
    return this._wrap(async () =>
      (await db.outbox
        .orderBy("id")
        .filter((e) => e.id > afterId && e.stato === "pending")
        .first()) || null
    );
  }

  async outboxBumpAttempts(id, next) {
    // SENTINEL_SEX_OUTBOX_BUMPATTEMPTS
    // Q-SEX-3=A: `attempts` lives on the element, so the parking lot can say
    // how many times the gesture was really tried (M3). The caller computes
    // `next` from the element it already holds -- no read-then-write here.
    return this._wrap(() => db.outbox.update(id, { attempts: next }));
  }

  async outboxCounts() {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_COUNTS
    return this._wrap(async () => {
      const pending = await db.outbox.where("stato").equals("pending").count();
      const parked = await db.outbox.where("stato").equals("parked").count();
      return { pending, parked };
    });
  }

  async outboxList(stato) {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_LIST
    return this._wrap(() => db.outbox.where("stato").equals(stato).sortBy("id"));
  }

  async outboxProtectedKeys() {
    // SENTINEL_PAR_22_198_SEPTVICIES_OUTBOX_PROTECTEDKEYS
    // Set of `${farmaco_id}|${data}|${dose_numero}` for every log row
    // frozen in a pending OR parked element. The mirror (14.4.4) skips
    // rows whose dose-key is protected, so a queued gesture is never
    // overwritten by a server snapshot before delivery (M2). Derived
    // from logs[] (buildLogWrite serializes those 3 fields).
    return this._wrap(() =>
      db.transaction("r", db.outbox, async () => {
        const rows = await db.outbox
          .where("stato")
          .anyOf("pending", "parked")
          .toArray();
        const keys = new Set();
        for (const el of rows) {
          for (const lg of el.logs || []) {
            keys.add(`${lg.farmaco_id}|${lg.data}|${lg.dose_numero}`);
          }
        }
        return keys;
      })
    );
  }
}
