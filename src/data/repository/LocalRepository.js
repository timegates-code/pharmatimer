import { db } from "../db.js";

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

export class LocalRepository {

  // ==========================================================
  // Profili
  // ==========================================================

  async getProfili() {
    return db.profilo_utente.orderBy("id").toArray();
  }

  async getProfiloAttivo() {
    // attivo is stored as 0/1 (IndexedDB cannot index booleans)
    return (await db.profilo_utente.where("attivo").equals(1).first()) || null;
  }

  async addProfilo(p) {
    return db.profilo_utente.add({ ...p, attivo: p.attivo ? 1 : 0 });
  }

  async updateProfilo(id, patch) {
    const clean = { ...patch };
    if ("attivo" in clean) clean.attivo = clean.attivo ? 1 : 0;
    await db.profilo_utente.update(id, clean);
  }

  async deleteProfilo(id) {
    // Refuse to delete the currently active profile — caller must
    // activate another one first. Keeps the invariant "exactly one
    // active profile" easy to maintain.
    const p = await db.profilo_utente.get(id);
    if (p && p.attivo === 1) {
      throw new Error("Non si può eliminare il profilo attivo. Attivane un altro prima.");
    }
    await db.profilo_utente.delete(id);
  }

  async setProfiloAttivo(id) {
    // Clear current active, set new one — in one transaction.
    await db.transaction("rw", db.profilo_utente, async () => {
      const current = await db.profilo_utente.where("attivo").equals(1).toArray();
      for (const p of current) {
        if (p.id !== id) {
          await db.profilo_utente.update(p.id, { attivo: 0 });
        }
      }
      await db.profilo_utente.update(id, { attivo: 1 });
    });
  }

  async setProfiloAttivoConCleanup(profiloId, logsToDelete) {
    // Atomic: (1) activate profile (deactivating others), (2) delete given logs.
    // Used by cambiaProfilo thunk (Sessione 5b) to clean up 'ricalcolata' logs
    // that lose meaning under a new profile. See Changelog Fase 2 §6.20.
    await db.transaction("rw", [db.profilo_utente, db.log_assunzioni], async () => {
      // 1. Activate target profile, deactivate others.
      const current = await db.profilo_utente.where("attivo").equals(1).toArray();
      for (const p of current) {
        if (p.id !== profiloId) {
          await db.profilo_utente.update(p.id, { attivo: 0 });
        }
      }
      await db.profilo_utente.update(profiloId, { attivo: 1 });

      // 2. Delete the given log rows (find by composite key).
      for (const l of logsToDelete) {
        const rows = await db.log_assunzioni
          .where("[farmaco_id+data]").equals([l.farmaco_id, l.data])
          .toArray();
        const toDel = rows.find(r => r.dose_numero === l.dose_numero);
        if (toDel) {
          await db.log_assunzioni.delete(toDel.id);
        }
      }
    });
  }

  // ==========================================================
  // Farmaci
  // ==========================================================

  async getFarmaci(opts = {}) {
    if (opts.soloAttivi) {
      return db.farmaci.where("attivo").equals(1).toArray();
    }
    return db.farmaci.orderBy("id").toArray();
  }

  async getFarmaco(id) {
    return (await db.farmaci.get(id)) || null;
  }

  async addFarmaco(f) {
    const clean = { ...f, attivo: f.attivo === 0 ? 0 : 1 };
    return db.farmaci.add(clean);
  }

  async updateFarmaco(id, patch) {
    const clean = { ...patch };
    if ("attivo" in clean) clean.attivo = clean.attivo ? 1 : 0;
    await db.farmaci.update(id, clean);
  }

  async deleteFarmaco(id) {
    // Soft delete: keep the row but set attivo=0.
    // This preserves log_assunzioni history. Hard-deletion of the
    // underlying row and its orari/log is only done via clearDemoData.
    await db.farmaci.update(id, { attivo: 0 });
  }

  // ==========================================================
  // Orari base
  // ==========================================================

  async getOrariByFarmaco(farmacoId) {
    return db.orari_base
      .where("farmaco_id").equals(farmacoId)
      .sortBy("dose_numero");
  }

  async getAllOrari() {
    return db.orari_base.orderBy("id").toArray();
  }

  async addOrario(o) {
    return db.orari_base.add({ ...o });
  }

  async updateOrario(id, patch) {
    await db.orari_base.update(id, patch);
  }

  async deleteOrario(id) {
    await db.orari_base.delete(id);
  }

  async replaceOrariForFarmaco(farmacoId, orari) {
    // Atomic replacement: drop all current schedules for this med,
    // then insert the new set. Used when the user edits the schedule
    // of a medication in Config.
    await db.transaction("rw", db.orari_base, async () => {
      await db.orari_base.where("farmaco_id").equals(farmacoId).delete();
      if (orari.length > 0) {
        await db.orari_base.bulkAdd(orari.map(o => ({ ...o, farmaco_id: farmacoId })));
      }
    });
  }

  // ==========================================================
  // Log assunzioni
  // ==========================================================

  async getLogByData(data) {
    return db.log_assunzioni.where("data").equals(data).toArray();
  }

  async getLogByRange(dataDa, dataA) {
    return db.log_assunzioni
      .where("data").between(dataDa, dataA, true, true)
      .toArray();
  }

  async getLogByFarmacoData(farmacoId, data) {
    return db.log_assunzioni
      .where("[farmaco_id+data]").equals([farmacoId, data])
      .sortBy("dose_numero");
  }

  async addLog(l) {
    return db.log_assunzioni.add({ ...l });
  }

  async updateLog(id, patch) {
    await db.log_assunzioni.update(id, patch);
  }

  async deleteLog(id) {
    await db.log_assunzioni.delete(id);
  }

  async upsertLog(farmacoId, data, doseNumero, patch) {
    // Find-or-create for the (farmaco, data, dose) tuple.
    // This is the primary write path for dose-state changes.
    return db.transaction("rw", db.log_assunzioni, async () => {
      const rows = await db.log_assunzioni
        .where("[farmaco_id+data]").equals([farmacoId, data])
        .toArray();
      const existing = rows.find(r => r.dose_numero === doseNumero);

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
        ...patch
      };
      const id = await db.log_assunzioni.add(full);
      return { ...full, id };
    });
  }

  // ==========================================================
  // Impostazioni
  // ==========================================================

  async getSetting(chiave) {
    const row = await db.impostazioni_app.get(chiave);
    return row ? row.valore : undefined;
  }

  async setSetting(chiave, valore) {
    await db.impostazioni_app.put({ chiave, valore });
  }

  async getAllSettings() {
    const rows = await db.impostazioni_app.toArray();
    return Object.fromEntries(rows.map(r => [r.chiave, r.valore]));
  }
}
