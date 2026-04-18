import { LocalRepository } from "./LocalRepository.js";

// ============================================================
// Repository factory.
// ============================================================
// Single instance, lazily created. Consumers import `repo` and
// use it directly:
//
//   import { repo } from "@/data/repository";
//   const farmaci = await repo.getFarmaci({ soloAttivi: true });
//
// When the FastAPI backend arrives, this factory will decide at
// runtime which implementation to return (e.g. based on a
// `backend_url` setting in impostazioni_app). No other file in
// the app will need changes.

let _instance = null;

export function getRepository() {
  if (!_instance) {
    _instance = new LocalRepository();
  }
  return _instance;
}

// Convenience default export for ergonomic imports.
export const repo = getRepository();
