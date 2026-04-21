// ============================================================
// Shared test fixtures and render helpers.
// - buildTestState(overrides) : minimal AppState ready-shape
// - buildTestPlan({dateStr})  : 3-entry Plan covering prevista/ricalcolata/presa
// - renderWithProvider(ui, {}) : render wrapped in a stub AppContext.Provider
//
// Stable signatures (AMB-7a.L): callers in 7b/7c/7d rely on these.
//
// 7d-1 refactor (§6.39, AMB-7d-1.I): `renderWithProvider` now uses the
// `wrapper` option of testing-library's `render` instead of wrapping the
// `ui` externally in `<AppContext.Provider>`. This is strictly a testing
// tooling change — the external signature is unchanged. The motivation is
// that testing-library's `rerender` reuses the original mount container
// and only re-renders the `ui` argument; with the external-wrap pattern
// `rerender` re-rendered the `ui` WITHOUT the Provider, causing
// `useAppContext` to throw "AppProvider is missing in the React tree".
// With the `wrapper` option the Provider is reapplied on every `rerender`.
//
// Compatibility: callers that previously worked around the limitation via
// `unmount() + new render(...)` (7c-1 test pattern, see §6.39 "fix tattico")
// keep working — that pattern is now superfluous but not harmful.
// ============================================================

import { render } from '@testing-library/react';
import { AppContext } from '../state/AppContext.jsx';
import { initialState } from '../state/reducer.js';

/**
 * Build a minimal ready AppState for tests. Override any field via `overrides`.
 * `impostazioni` defaults to an empty object (see AMB-7a.M / §6.27).
 * @param {Partial<import('../state/reducer.js').AppState>} overrides
 */
export function buildTestState(overrides = {}) {
  return {
    ...initialState,
    status: 'ready',
    impostazioni: {},
    ...overrides,
  };
}

/**
 * Build a 3-entry Plan with one entry per state that most tests care about:
 *   [0] 'prevista'     – dose 1 at 08:00
 *   [1] 'ricalcolata'  – dose 2 ora_prevista 16:00, ora_ricalcolata 16:30, gap 30
 *   [2] 'presa'        – dose 3 ora_prevista 00:00, presa alle 23:55 (delta -5)
 * Farmaco is a minimal denormalised object (AMB-7a.D confirmed).
 *
 * @param {{dateStr?: string}} [opts]
 * @returns {import('../domain/types.js').Plan}
 */
export function buildTestPlan({ dateStr = '2026-04-19' } = {}) {
  const farmaco = {
    id: 1,
    nome: 'Demo Med',
    principio_attivo: 'demo',
    funzione: 'demo',
    tipo_frequenza: 'intervallo',
    intervallo_ore: 8,
    intervallo_minimo_ore: 6,
    dosi_giornaliere: 3,
    relazione_pasto: 'indifferente',
    dettaglio_pasto: null,
    note: null,
    data_inizio: dateStr,
    data_fine: null,
    attivo: 1,
  };
  const orario = (dose_numero) => ({
    id: dose_numero,
    farmaco_id: 1,
    dose_numero,
    offset_minuti: 0,
    ancora_riferimento: 'assoluto',
    descrizione_momento: null,
  });
  return [
    {
      key: `${dateStr}-1-1`, dateStr, farmaco, orario: orario(1),
      ora_prevista: '08:00', ora_ricalcolata: null, ora_ricalcolata_originale: null,
      ora_effettiva: null, delta_minuti: null,
      gap_minuti: 0, gap_originale: 0, recupero_minuti: 0,
      stato: 'prevista', dose_prec_saltata: false,
    },
    {
      key: `${dateStr}-1-2`, dateStr, farmaco, orario: orario(2),
      ora_prevista: '16:00', ora_ricalcolata: '16:30', ora_ricalcolata_originale: '16:30',
      ora_effettiva: null, delta_minuti: null,
      gap_minuti: 30, gap_originale: 30, recupero_minuti: 0,
      stato: 'ricalcolata', dose_prec_saltata: false,
    },
    {
      key: `${dateStr}-1-3`, dateStr, farmaco, orario: orario(3),
      ora_prevista: '00:00', ora_ricalcolata: null, ora_ricalcolata_originale: null,
      ora_effettiva: `${dateStr}T23:55:00`, delta_minuti: -5,
      gap_minuti: 0, gap_originale: 0, recupero_minuti: 0,
      stato: 'presa', dose_prec_saltata: false,
    },
  ];
}

/** Default no-op action bag mirroring the 12 real thunks from state/actions.js. */
function defaultNoopActions() {
  return {
    init: async () => {},
    rebuildPlan: async () => {},
    presa: async () => {},
    salta: async () => {},
    sospendi: async () => {},
    recupero: async () => {},
    ripristina: async () => {},
    annullaUltima: async () => {},
    cambiaProfilo: async () => {},
    dismissPrompt: () => {},
    setSetting: async () => ({ ok: true }),
    setSimulatedNow: () => {},
  };
}

/**
 * Render `ui` inside a stub AppContext.Provider so hooks/components that
 * call useAppContext() work without spinning up the real AppProvider
 * (which would trigger repo.init() asynchronously).
 *
 * Uses testing-library's `wrapper` option (7d-1 refactor, §6.39) so that
 * `rerender(newUi)` reapplies the Provider instead of losing it.
 *
 * @param {React.ReactNode} ui
 * @param {{stateOverrides?: object, actions?: object, tickMs?: number}} [options]
 */
export function renderWithProvider(ui, options = {}) {
  const { stateOverrides = {}, actions = {}, tickMs } = options;
  const state = buildTestState(stateOverrides);
  const mergedActions = { ...defaultNoopActions(), ...actions };
  const value = { state, actions: mergedActions, tickMs: tickMs ?? Date.now() };
  function Wrapper({ children }) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
  }
  return render(ui, { wrapper: Wrapper });
}
