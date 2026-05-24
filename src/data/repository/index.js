import { LocalRepository } from "./LocalRepository.js";
import { ApiRepository } from "./ApiRepository.js";

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

function _shouldUseApiRepo() {
  try {
    return localStorage.getItem(USE_API_REPO_FLAG) === "1";
  } catch {
    return false;
  }
}

export function getRepository() {
  if (!_instance) {
    _instance = _shouldUseApiRepo()
      ? new ApiRepository()
      : new LocalRepository();
  }
  return _instance;
}

// Convenience default export for ergonomic imports.
export const repo = getRepository();
