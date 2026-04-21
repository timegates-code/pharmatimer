// ============================================================
// Test helper — mount the real AppProvider for integration tests.
// Sessione 7c-2 (AMB-7c-2.G). Changelog §11 / §6.49.
// ============================================================
//
// Why it exists.
//   AppProvider in src/state/AppContext.jsx imports the repo singleton
//   statically from '../data/repository/index.js' and calls init() on
//   mount. In jsdom that triggers a real Dexie/IndexedDB path which
//   fails (no IDB implementation). §6.49 defers the retrofit of an
//   `initialStateProp` bypass on AppProvider to Sessione 7d; 7c-2
//   therefore needs an integration helper that works WITHOUT touching
//   AppProvider.
//
// Strategy.
//   The helper does NOT mock anything by itself. It assumes the test
//   file has installed a vi.mock on '../data/repository/index.js' that
//   substitutes a fake repo. The helper only provides:
//     - DEFAULT_SEED           the in-memory seed shape
//     - makeFakeRepo(seed?)    factory for a fake IRepository-shaped
//                              object the test can plug into vi.mock
//     - renderWithRealProvider(ui) + ctxRef capture
//     - waitForReady(ctxRef)   polls state.status → 'ready'
//     - runAction(fn)          act() wrapper for thunk invocations
//
// Usage pattern (mirror in OggiView.test.jsx, CP4).
//
//   import { vi, beforeEach } from 'vitest';
//   import {
//     makeFakeRepo, renderWithRealProvider, waitForReady, runAction,
//   } from '../../test/renderWithRealProvider.jsx';
//
//   let fakeRepo;
//   vi.mock('../../data/repository/index.js', () => ({
//     get repo() { return fakeRepo; },
//     getRepository: () => fakeRepo,
//   }));
//
//   beforeEach(() => { fakeRepo = makeFakeRepo(/* seed override */); });
//
//   it('…', async () => {
//     const { ctxRef, unmount } = renderWithRealProvider(<OggiView />);
//     await waitForReady(ctxRef);
//     await runAction(() => ctxRef.current.actions.setSimulatedNow('14:00'));
//     await runAction(() => ctxRef.current.actions.presa('…', { … }));
//     // assertions …
//     unmount();
//   });
//
// Per-test repo isolation (§6.39 pattern).
//   Each test recreates `fakeRepo` in beforeEach. Because the mock
//   factory exposes `repo` via a getter, the new instance is picked
//   up at import-read time on every new mount. No `vi.resetModules`
//   is required. For scenarios that cross render boundaries (seed
//   change mid-test), unmount() and call renderWithRealProvider again
//   after replacing fakeRepo.
//
// Repo coverage.
//   Concrete behaviour is implemented only for the 7 methods the
//   thunks actually call in 7c-2:
//     getProfili, getFarmaci, getAllOrari, getAllSettings,
//     getLogByRange, upsertLogsBatch, setSetting.
//   The rest of IRepository is stubbed as benign no-ops so that an
//   unexpected call does not crash the render. If a future test needs
//   concrete semantics on one of them, extend in place rather than
//   silently relying on the stub.
// ============================================================

import { act, render, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../state/AppContext.jsx';

// JSON-clone: seeds and repo rows are JSON-clean (no Date/Map/Set/funcs).
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

// ------------------------------------------------------------
// DEFAULT_SEED — minimal baseline that lets init() succeed and
// produces 2 doses/day for 1 farmaco, enough to stage a gap
// recovery scenario (N taken late → N+1 recalc triggers prompt).
// Tests override via makeFakeRepo({...}).
// ------------------------------------------------------------

export const DEFAULT_SEED = {
  profili: [
    {
      id: 1,
      nome_profilo: 'Test',
      ora_sveglia:   '07:00',
      ora_colazione: '08:00',
      ora_pranzo:    '12:30',
      ora_cena:      '19:30',
      ora_sonno:     '23:00',
      attivo: 1,
    },
  ],
  farmaci: [
    {
      id: 1,
      nome: 'FarmacoTest',
      // 'intervallo' is REQUIRED for the cascade branch in recalc.js
      // (line ~348) to run: only this branch patches N+1 with
      // ora_ricalcolata / newGap and emits state.prompt. 'fisso' skips
      // cascade entirely, so a 'fisso' seed would never produce a
      // gap_recovery prompt regardless of delta — a test seed bug that
      // would silently break every 7c-2 scenario.
      tipo_frequenza: 'intervallo',
      intervallo_ore: 4,
      intervallo_minimo_ore: 3,
      dosi_giornaliere: 2,
      relazione_pasto: 'indifferente',
      data_inizio: '2026-01-01',
      data_fine: null,
      attivo: 1,
    },
  ],
  orari: [
    { id: 1, farmaco_id: 1, dose_numero: 1, offset_minuti: 0, ancora_riferimento: 'colazione' },
    { id: 2, farmaco_id: 1, dose_numero: 2, offset_minuti: 0, ancora_riferimento: 'pranzo' },
  ],
  logs: [],
  impostazioni: {},
};

// ------------------------------------------------------------
// makeFakeRepo — in-memory IRepository shape. Mutations from
// thunks (upsertLogsBatch / setSetting / setProfiloAttivoConCleanup)
// persist inside the returned instance; subsequent reads reflect them.
// ------------------------------------------------------------

/**
 * @param {Partial<typeof DEFAULT_SEED>} [seed]
 * @returns {object}  An object conforming to the IRepository contract
 *   for the methods actually used by 7c-2 tests (concrete), plus
 *   no-op stubs for the rest (avoid crashes on unexpected calls).
 */
export function makeFakeRepo(seed = {}) {
  const db = {
    profili:      clone(seed.profili      ?? DEFAULT_SEED.profili),
    farmaci:      clone(seed.farmaci      ?? DEFAULT_SEED.farmaci),
    orari:        clone(seed.orari        ?? DEFAULT_SEED.orari),
    logs:         clone(seed.logs         ?? DEFAULT_SEED.logs),
    impostazioni: clone(seed.impostazioni ?? DEFAULT_SEED.impostazioni),
  };

  // upsert helper shared by upsertLog / upsertLogsBatch.
  const upsertOne = (l) => {
    const i = db.logs.findIndex(
      (x) =>
        x.farmaco_id === l.farmaco_id &&
        x.data === l.data &&
        x.dose_numero === l.dose_numero
    );
    if (i >= 0) {
      db.logs[i] = { ...db.logs[i], ...clone(l) };
      return clone(db.logs[i]);
    }
    const row = { ...clone(l), id: db.logs.length + 1 };
    db.logs.push(row);
    return clone(row);
  };

  return {
    // --- Profili (concrete for init; rest benign) ---
    getProfili:                 async () => clone(db.profili),
    getProfiloAttivo:           async () => clone(db.profili.find((p) => p.attivo) ?? null),
    addProfilo:                 async () => {},
    updateProfilo:              async () => {},
    deleteProfilo:              async () => {},
    setProfiloAttivo:           async (id) => {
      db.profili = db.profili.map((p) => ({ ...p, attivo: p.id === id ? 1 : 0 }));
    },
    setProfiloAttivoConCleanup: async (id, logsToDelete) => {
      db.profili = db.profili.map((p) => ({ ...p, attivo: p.id === id ? 1 : 0 }));
      for (const spec of logsToDelete ?? []) {
        db.logs = db.logs.filter(
          (l) => !(
            l.farmaco_id === spec.farmaco_id &&
            l.data === spec.data &&
            l.dose_numero === spec.dose_numero
          )
        );
      }
    },

    // --- Farmaci (concrete getters; writes benign) ---
    getFarmaci: async (opts) => {
      const all = clone(db.farmaci);
      return opts?.soloAttivi ? all.filter((f) => f.attivo) : all;
    },
    getFarmaco:    async (id) => clone(db.farmaci.find((f) => f.id === id) ?? null),
    addFarmaco:    async () => {},
    updateFarmaco: async () => {},
    deleteFarmaco: async () => {},

    // --- Orari (concrete getters; writes benign) ---
    getOrariByFarmaco:       async (fid) => clone(db.orari.filter((o) => o.farmaco_id === fid)),
    getAllOrari:             async () => clone(db.orari),
    addOrario:               async () => {},
    updateOrario:            async () => {},
    deleteOrario:            async () => {},
    replaceOrariForFarmaco:  async () => {},

    // --- Log assunzioni (full concrete: thunks exercise these) ---
    getLogByData:        async (data) => clone(db.logs.filter((l) => l.data === data)),
    // Sessione 7d-2 CP3 hotfix: mirror LocalRepository.getLogByDataStato.
    // Returns entries filtered by (data, stato), ASC by ora_effettiva.
    // Nulls sort last (defensive; 'presa' rows always have ora_effettiva).
    getLogByDataStato:   async (data, stato) => {
      const rows = db.logs.filter((l) => l.data === data && l.stato === stato);
      rows.sort((a, b) => {
        if (a.ora_effettiva == null && b.ora_effettiva == null) return 0;
        if (a.ora_effettiva == null) return 1;
        if (b.ora_effettiva == null) return -1;
        if (a.ora_effettiva < b.ora_effettiva) return -1;
        if (a.ora_effettiva > b.ora_effettiva) return 1;
        return 0;
      });
      return clone(rows);
    },
    getLogByRange:       async (dataDa, dataA) =>
      clone(db.logs.filter((l) => l.data >= dataDa && l.data <= dataA)),
    getLogByFarmacoData: async (fid, data) =>
      clone(db.logs.filter((l) => l.farmaco_id === fid && l.data === data)),
    addLog:              async (l) => { const id = db.logs.length + 1; db.logs.push({ ...clone(l), id }); return id; },
    updateLog:           async () => {},
    deleteLog:           async () => {},
    upsertLog:           async (fid, data, dose, patch) =>
      upsertOne({ farmaco_id: fid, data, dose_numero: dose, ...clone(patch) }),
    upsertLogsBatch:     async (logs) => (logs ?? []).map((l) => upsertOne(l)),

    // --- Impostazioni (full concrete) ---
    getSetting:     async (chiave) => clone(db.impostazioni[chiave]),
    setSetting:     async (chiave, valore) => { db.impostazioni[chiave] = clone(valore); },
    getAllSettings: async () => clone(db.impostazioni),

    // --- Test utility (NOT part of IRepository) ---
    // Inspect current in-memory state for post-mutation assertions.
    __db: () => clone(db),
  };
}

// ------------------------------------------------------------
// renderWithRealProvider + context capture
// ------------------------------------------------------------

/**
 * Mount the real AppProvider wrapping `ui`. The AppContext value
 * `{state, actions, tickMs}` is surfaced via `ctxRef.current`, which
 * updates on every render driven by state changes.
 *
 * Pre-condition: the caller has installed a vi.mock replacing the
 * repository singleton with a fake (see module header).
 *
 * @param {React.ReactElement} ui
 * @param {Parameters<typeof render>[1]} [options]
 * @returns {ReturnType<typeof render> & { ctxRef: {current: any|null} }}
 */
export function renderWithRealProvider(ui, options) {
  const ctxRef = { current: null };

  // CtxCapture lives inside the Provider tree and writes the live
  // context value to a closed-over ref on every render. Writing to
  // a ref (not state) during render is safe per React docs — it
  // does not trigger re-renders or violate concurrent-mode rules.
  function CtxCapture() {
    const ctx = useAppContext();
    ctxRef.current = ctx;
    return null;
  }

  const utils = render(
    <AppProvider>
      <CtxCapture />
      {ui}
    </AppProvider>,
    options
  );

  return { ...utils, ctxRef };
}

// ------------------------------------------------------------
// waitForReady — poll until AppProvider's init thunk completes
// ------------------------------------------------------------

/**
 * Resolve once state.status transitions to 'ready'. Throws (via
 * waitFor's retry budget) if it stays 'idle' past the timeout or
 * transitions to 'error' (fail fast with the error payload for
 * debuggability).
 *
 * @param {{current: any|null}} ctxRef
 * @param {{timeout?: number}} [opts]
 */
export async function waitForReady(ctxRef, { timeout = 2000 } = {}) {
  await waitFor(
    () => {
      const s = ctxRef.current?.state;
      if (!s) throw new Error('waitForReady: ctxRef not yet hydrated');
      if (s.status === 'error') {
        // Bail out of the retry loop: init failures are not transient.
        throw new Error(
          `waitForReady: init failed (${s.error?.code ?? 'unknown'}): ${s.error?.message ?? ''}`
        );
      }
      if (s.status !== 'ready') {
        throw new Error(`waitForReady: still ${s.status}`);
      }
    },
    { timeout }
  );
}

// ------------------------------------------------------------
// runAction — act() wrapper for dispatching thunks
// ------------------------------------------------------------

/**
 * Execute `fn` (typically a thunk call) inside act() so that all
 * resulting React state updates flush before the test continues.
 *
 * @param {() => (void | Promise<void>)} fn
 */
export async function runAction(fn) {
  await act(async () => {
    await fn();
  });
}
