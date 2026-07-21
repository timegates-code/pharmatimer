import { LocalRepository } from "./LocalRepository.js";
import { ApiRepository } from "./ApiRepository.js";
import { SyncRepository } from "./SyncRepository.js";

// ============================================================
// Repository factory (Fase 3 F3-S5-alpha MOD N+5.I par.11.N-S3).
// ============================================================
// Single instance, lazily created. Consumers import `repo` and
// use it directly:
//
//   import { repo } from "@/data/repository";
//   const farmaci = await repo.getFarmaci({ soloAttivi: true });
//
// Runtime toggle (sub-AMB O par.22.90 + EMP-1 par.22.90):
//   localStorage.setItem('pharmatimer.useApiRepo', '1')
//   reload pagina (eager singleton evaluation, no hot-swap).
// Default: LocalRepository (IndexedDB Dexie).
// When '1' is set: ApiRepository (FastAPI + composition LocalRepo delegate).

let _instance = null;

const USE_API_REPO_FLAG = "pharmatimer.useApiRepo";

// SENTINEL_N5QC_CP1_SHOULD_USE_API_REPO -- Q-W.2 single source of truth (env OR localStorage), cross-path invariant s.6.205.
// Build-time env (VITE_USE_API=1, profilo Mini) OR runtime localStorage toggle (dev).
export function shouldUseApiRepo() {
  try {
    if (import.meta.env && import.meta.env.VITE_USE_API === "1") {
      return true;
    }
  } catch {
    // import.meta.env non disponibile -- prosegui con localStorage
  }
  try {
    return localStorage.getItem(USE_API_REPO_FLAG) === "1";
  } catch {
    return false;
  }
}

// Retrocompat: delega all'unica fonte sopra cosi factory e legacy non divergono.
function _shouldUseApiRepo() {
  return shouldUseApiRepo();
}

export function getRepository() {
  if (!_instance) {
    // SENTINEL_PAR_22_198_QUINVICIES_FACTORY_WIRE -- CS-3 (Spec 14.4):
    // on the API path, wrap ApiRepository with the SyncRepository read-
    // guard. The shared LocalRepository is both the ApiRepository
    // delegate (profili/impostazioni) and the SyncRepository mirror
    // target; `db` is a module singleton so all local ops hit one IDB.
    if (shouldUseApiRepo()) {
      const local = new LocalRepository();
      const api = new ApiRepository(local);
      _instance = new SyncRepository(api, local);
    } else {
      _instance = new LocalRepository();
    }
  }
  return _instance;
}

// Convenience default export for ergonomic imports.
export const repo = getRepository();
