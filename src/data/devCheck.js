import { db } from "./db.js";
import { runSeedIfNeeded, clearDemoData, wipeDatabase } from "./seed.js";
import { repo } from "./repository/index.js";

// ============================================================
// Dev-only diagnostics.
// Exposes a global `window.__pt` namespace in development builds
// so we can test the DB and repository from the browser console
// without any UI. Disabled in production builds.
// ============================================================

export function installDevCheck() {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;

  window.__pt = {
    db,
    repo,
    seed: runSeedIfNeeded,
    clearDemo: clearDemoData,
    // 8d-C (§6.113, chiude §6.85 con archiviazione): confirm obbligatorio.
    // wipeDatabase fa db.delete() totale; senza reload Dexie continua a
    // operare su un DB cancellato (comportamento indefinito). Incident 8a
    // CP browser 4->5 (§6.85 nome_utente azzerato) probabile causa:
    // __pt.wipe() invocato dalla Console senza intent, nessuna safety net.
    // Fix: confirm prompt + reload automatico post-wipe.
    wipe: async () => {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(
        '__pt.wipe() drops the entire IndexedDB. Confirm?\n\n' +
        'The page will reload automatically after wipe.'
      );
      if (!ok) {
        // eslint-disable-next-line no-console
        console.log('[__pt.wipe] cancelled');
        return;
      }
      await wipeDatabase();
      // eslint-disable-next-line no-console
      console.log('[__pt.wipe] DONE. Reloading...');
      window.location.reload();
    },

    async inspect() {
      const [profili, farmaci, orari, log, settings] = await Promise.all([
        db.profilo_utente.toArray(),
        db.farmaci.toArray(),
        db.orari_base.toArray(),
        db.log_assunzioni.toArray(),
        db.impostazioni_app.toArray()
      ]);
      console.group("PharmaTimer DB snapshot");
      console.log("profilo_utente:", profili);
      console.log("farmaci:", farmaci);
      console.log("orari_base:", orari);
      console.log("log_assunzioni:", log);
      console.log("impostazioni_app:", settings);
      console.groupEnd();
      return { profili, farmaci, orari, log, settings };
    },

    async counts() {
      const c = {
        profili: await db.profilo_utente.count(),
        farmaci: await db.farmaci.count(),
        orari: await db.orari_base.count(),
        log: await db.log_assunzioni.count(),
        settings: await db.impostazioni_app.count()
      };
      console.table(c);
      return c;
    },

    // ------------------------------------------------------
    // Repository smoke test: exercises every method end-to-end
    // without leaving any garbage in the DB.
    // Run: await __pt.testRepo()
    // ------------------------------------------------------
    async testRepo() {
      const assert = (cond, msg) => {
        if (!cond) throw new Error("FAIL: " + msg);
        console.log("  ✓ " + msg);
      };

      console.group("Repository smoke test");
      try {
        // --- Profili ---
        const profili = await repo.getProfili();
        assert(profili.length >= 2, "getProfili returns seeded profiles");
        const attivo = await repo.getProfiloAttivo();
        assert(attivo && attivo.nome_profilo === "Standard", "active profile is Standard");

        // --- Farmaci ---
        const tutti = await repo.getFarmaci();
        const attivi = await repo.getFarmaci({ soloAttivi: true });
        assert(tutti.length === 11, "getFarmaci returns 11 seeded meds");
        assert(attivi.length === 11, "all seeded meds are active");
        const f1 = await repo.getFarmaco(1);
        assert(f1 && f1.nome === "Pantorc 40mg", "getFarmaco(1) is Pantorc");

        // --- Orari ---
        const orariPantorc = await repo.getOrariByFarmaco(1);
        assert(orariPantorc.length === 1, "Pantorc has 1 schedule");
        assert(orariPantorc[0].offset_minuti === -30, "Pantorc offset is -30 min");

        // --- Upsert log (create + update cycle) ---
        const today = new Date().toISOString().slice(0, 10);
        const created = await repo.upsertLog(1, today, 1, {
          ora_prevista: "07:00",
          stato: "presa",
          ora_effettiva: "07:05",
          delta_minuti: 5
        });
        assert(created.id && created.stato === "presa", "upsertLog creates new row");

        const updated = await repo.upsertLog(1, today, 1, { note: "smoke test" });
        assert(updated.note === "smoke test", "upsertLog updates existing row");

        const logs = await repo.getLogByData(today);
        assert(logs.length >= 1, "getLogByData returns today's entries");

        // Cleanup — remove the smoke-test log so the DB stays clean
        await repo.deleteLog(created.id);
        const after = await repo.getLogByFarmacoData(1, today);
        assert(after.length === 0, "cleanup succeeded");

        // --- Settings ---
        await repo.setSetting("_smoke_test", "hello");
        const v = await repo.getSetting("_smoke_test");
        assert(v === "hello", "setSetting/getSetting roundtrip");
        // Cleanup settings
        await db.impostazioni_app.delete("_smoke_test");

        console.log("%c✅ All repository tests passed", "color:#15803D;font-weight:bold");
      } catch (err) {
        console.error("%c❌ " + err.message, "color:#B91C1C;font-weight:bold");
        throw err;
      } finally {
        console.groupEnd();
      }
    },

    // ------------------------------------------------------
    // Smoke test for setProfiloAttivoConCleanup (Sessione 5a).
    // Creates a throwaway log, activates the "other" seed profile
    // with cleanup targeting that log, verifies outcome, then
    // restores the original profile. Leaves DB clean.
    // Run: await __pt.testProfileCleanup()
    // ------------------------------------------------------
    async testProfileCleanup() {
      const assert = (cond, msg) => {
        if (!cond) throw new Error("FAIL: " + msg);
        console.log("  ✓ " + msg);
      };
      console.group("setProfiloAttivoConCleanup smoke test");
      const originale = await repo.getProfiloAttivo();
      const tutti = await repo.getProfili();
      const altro = tutti.find(p => p.id !== originale.id);
      assert(altro, "a second profile exists in seed");

      const today = new Date().toISOString().slice(0, 10);
      const dummy = await repo.upsertLog(1, today, 99, {
        ora_prevista: "23:59",
        stato: "ricalcolata",
        ora_ricalcolata: "23:30",
      });
      assert(dummy.id, "dummy log created");

      try {
        await repo.setProfiloAttivoConCleanup(altro.id, [
          { farmaco_id: 1, data: today, dose_numero: 99 }
        ]);
        const nuovoAttivo = await repo.getProfiloAttivo();
        assert(nuovoAttivo.id === altro.id, "other profile is now active");

        const residui = await repo.getLogByFarmacoData(1, today);
        const dose99 = residui.find(r => r.dose_numero === 99);
        assert(!dose99, "dummy log deleted");

        console.log("%c✅ testProfileCleanup passed", "color:#15803D;font-weight:bold");
      } finally {
        // Restore original profile — best effort.
        await repo.setProfiloAttivo(originale.id);
        console.groupEnd();
      }
    }
  };

  // eslint-disable-next-line no-console
  console.log(
    "%c[PharmaTimer] Dev helpers ready. Try: __pt.counts() / __pt.inspect() / __pt.testRepo() / __pt.wipe()",
    "color:#2563EB;font-weight:bold"
  );
}
