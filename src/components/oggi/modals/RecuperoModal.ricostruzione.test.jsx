// ============================================================
// SONDA `misura-coppia-client` -- CS-5.2 fase F1 (Q-URTO-2=A, Q-URTO-3=A).
// ============================================================
//
// WARNING -- READ BEFORE "FIXING" A RED HERE.
// This file is a MEASUREMENT probe, not a regression guard. It pins the
// behaviour MEASURED TODAY, defect included. If the successor repair row
// lands (mergeLogIntoEntry rebuilding the pre-recovery snapshot), these
// expectations MUST be rewritten by that same session -- a red here after
// the repair is the EXPECTED signal, not a regression.
// Greppable marker of that contract: SENTINEL_MCC_MISURA_NON_GUARDIA.
//
// WHAT IT MEASURES
// `src/domain/planBuilder.js` mergeLogIntoEntry (:76-83) carries back SIX
// fields from the server log and rebuilds neither `ora_ricalcolata_originale`
// (defaulted null at :153 and :191) nor `gap_originale` (defaulted 0 at :157
// and :195). The server has no such columns by DDL: the pre-recovery
// snapshot is a client-side session artifact, written by recalc.js :426/:429
// and lost on any plan rebuilt from server logs.
//
// The state under test -- snapshot ABSENT while `recupero_minuti` is VALUED --
// is NOT producible inside a session: recalc.js writes both `*_originale`
// fields equal to their current counterparts, and applyRecupero (:497-500)
// only ever touches `ora_ricalcolata` and `recupero_minuti`. It is reachable
// ONLY through reconstruction, which is why `src/domain/recalc.test.js` :936
// -- which pins the same fallback on a hand-built entry -- does not cover it.
//
// THREE OUTCOMES DECLARED BEFORE THE PROBE RAN (LC-106)
//   1. surface only          -- wrong base displayed, nothing wrong leaves.
//   2. mirror divergent, reabsorbed  -- wrong value enters the local plan,
//      a successful reread realigns `ora_ricalcolata` (but NOT the snapshot).
//   3. mirror divergent, PERSISTENT offline -- no reread, drift compounds.
// F3 separates 1 from {2,3}. F4 separates 2 from 3 AT DOMAIN LEVEL, by
// refeeding the produced logWrite as a mirror row: pure functions only, no
// Dexie, no SyncRepository.
//
// DECLARED RESIDUAL, ANCHORED TO CS-6
// The Dexie + SyncRepository leg is NOT exercised. This probe does not prove
// the drifted row survives a restart, only that the domain compounds it.
// CS-6 already carries "riavvio offline con prese al buio" in its matrix.
//
// SECOND FIELD: `gap_originale` -- measured INERT, and F5 pins the inertia.
// Zero production READ sites exist (only writes at recalc.js :247/:429/:592/
// :646/:763 plus the two planBuilder defaults). Under the absolute recupero
// semantics of s.6.263 `gap_minuti` is never decremented, so the residual is
// `gap_minuti - recupero_minuti` and a gap snapshot serves nobody.
// Same shape as the other field, opposite clinical exposure.
//
// ENVIRONMENT: jsdom, supplied by vitest.config.js :25. This file mounts a
// component, so it must NOT carry the per-file environment docblock that the
// DOM-free domain suites use. That docblock name is deliberately never
// spelled out anywhere in this file: vitest scans the source for it and
// would apply it even from inside a comment that denies it -- measured the
// hard way, Registro voce 135, family of voce 99.
// Renders are unmounted explicitly, mirroring the proven pattern of
// `RecuperoModal.test.jsx` :65-67 and :87.

import { describe, it, expect } from 'vitest';
import { renderWithProvider } from '../../../test/renderHelpers.jsx';
import { RecuperoModal } from './RecuperoModal.jsx';
import { buildMultiDayPlan } from '../../../domain/planBuilder.js';
import { applyRecupero } from '../../../domain/recalc.js';

const DATA = '2026-04-19';
const ENTRY_KEY = `${DATA}-1-1`;

// Shape mirrored from src/domain/planBuilder.test.js :7-16.
const PROFILO = {
  id: 1,
  nome_profilo: 'Standard',
  ora_sveglia: '07:00',
  ora_colazione: '07:30',
  ora_pranzo: '13:00',
  ora_cena: '20:30',
  ora_sonno: '23:30',
  attivo: 1,
};

// `intervallo_minimo_ore: null` is load-bearing: measured at
// recalc.test.js :89-91, calcolaRecuperoMax then returns the whole gap,
// so a 30 min recovery on a 60 min gap is always admissible and the probe
// never trips the RECUPERO_ECCESSIVO guard (recalc.js :487-492).
// `intervallo_ore: 8` keeps us on the standard branch (<= 24h).
// No `created_at`: computeTInizio degrades to data_inizio 00:00, so the
// P20 visibility filter (planBuilder.js :143-144) stays inert.
const FARMACO = {
  id: 1,
  nome: 'Test 100mg',
  funzione: 'Test',
  tipo_frequenza: 'intervallo',
  intervallo_ore: 8,
  intervallo_minimo_ore: null,
  dosi_giornaliere: 1,
  relazione_pasto: 'indifferente',
  dettaglio_pasto: null,
  note: null,
  data_inizio: '2024-01-01',
  data_fine: null,
  attivo: 1,
};

const ORARIO = {
  id: 11,
  farmaco_id: 1,
  dose_numero: 1,
  offset_minuti: -30,
  ancora_riferimento: 'colazione',
  descrizione_momento: null,
};

/**
 * A server row as it exists AFTER a 30 min recovery: the original recalculated
 * time was 18:00, the stored one is 17:30, the total is 30, the gap stays 60
 * (never decremented, s.6.263). Fifteen-column DDL: no `*_originale`.
 */
function rigaServer(overrides = {}) {
  return {
    data: DATA,
    farmaco_id: FARMACO.id,
    dose_numero: ORARIO.dose_numero,
    stato: 'ricalcolata',
    ora_effettiva: null,
    delta_minuti: null,
    ora_ricalcolata: `${DATA}T17:30`,
    gap_minuti: 60,
    recupero_minuti: 30,
    ...overrides,
  };
}

/** Rebuild the plan the way init / rebuildPlan does: from server log rows. */
function ricostruisci(logRows) {
  return buildMultiDayPlan({
    profilo: PROFILO,
    farmaci: [FARMACO],
    orari: [ORARIO],
    logAssunzioni: logRows,
    startDate: DATA,
    numDays: 1,
  });
}

function montaModulo(entry) {
  return renderWithProvider(
    <RecuperoModal
      entry={entry}
      onApply={() => {}}
      onReset={() => {}}
      onClose={() => {}}
    />
  );
}

describe('SONDA misura-coppia-client -- ricostruzione del piano dai log del server', () => {
  // ---------- F1 -- lo stato non producibile in sessione ----------
  // SENTINEL_MCC_F1_RICOSTRUZIONE
  it('F1: la ricostruzione produce snapshot ASSENTE con recupero VALORIZZATO', () => {
    const plan = ricostruisci([rigaServer()]);
    expect(plan).toHaveLength(1);
    const e = plan[0];

    // Carried back by mergeLogIntoEntry :77-82.
    expect(e.key).toBe(ENTRY_KEY);
    expect(e.stato).toBe('ricalcolata');
    expect(e.ora_ricalcolata).toBe(`${DATA}T17:30`);
    expect(e.gap_minuti).toBe(60);
    expect(e.recupero_minuti).toBe(30);

    // NOT carried back -- the whole point of the probe.
    expect(e.ora_ricalcolata_originale).toBeNull();
    expect(e.gap_originale).toBe(0);
  });

  // ---------- F2 -- cio che la persona LEGGE ----------
  // SENTINEL_MCC_F2_SUPERFICIE
  it('F2: il modulo mostra come base il tempo GIA recuperato, non lo originale', () => {
    const entry = ricostruisci([rigaServer()])[0];
    const { getByTestId, getByText, queryByText, getByRole, unmount } =
      montaModulo(entry);

    // RecuperoModal.jsx :66 -- the cursor starts from the stored total.
    expect(getByTestId('rec-value')).toHaveTextContent('30 min');

    // RecuperoModal.jsx :86 -- baseT falls back to ora_ricalcolata.
    expect(getByText('17:30')).toBeTruthy(); // wrong base, on screen
    expect(queryByText('18:00')).toBeNull(); // correct base, absent

    // The person reads "from 17:30 to 17:00" instead of "from 18:00 to 17:30".
    expect(getByTestId('new-time')).toHaveTextContent('17:00');

    // And confirming takes ONE tap, with nothing touched: the primary button
    // is already enabled and already carries the stored total (:227-236).
    expect(getByRole('button', { name: /Anticipa di 30 min/i })).toBeEnabled();

    unmount();
  });

  // ---------- F3 -- il valore sbagliato LASCIA il modulo ----------
  // SENTINEL_MCC_F3_LOGWRITE
  it('F3: applyRecupero serializza il valore spostato -- non e sola superficie', () => {
    const plan = ricostruisci([rigaServer()]);
    const result = applyRecupero(plan, ENTRY_KEY, 30);

    expect(result.logWrites).toHaveLength(1);
    // 17:30 - 30 = 17:00. With the snapshot rebuilt it would be
    // 18:00 - 30 = 17:30, i.e. the row would not move at all.
    expect(result.logWrites[0].ora_ricalcolata).toBe(`${DATA}T17:00`);
    expect(result.logWrites[0].recupero_minuti).toBe(30);
    expect(result.logWrites[0].stato).toBe('ricalcolata');

    // buildLogWrite (recalc.js :63-75) carries NEITHER `*_originale` field:
    // nothing on the wire can let the server or a reread restore them.
    expect(result.logWrites[0].ora_ricalcolata_originale).toBeUndefined();
    expect(result.logWrites[0].gap_originale).toBeUndefined();
  });

  // ---------- F4 -- esito 2 contro esito 3: la deriva e CUMULATIVA ----------
  // SENTINEL_MCC_F4_CUMULATIVA
  it('F4: il secondo giro riparte dal valore gia spostato', () => {
    const giro1 = applyRecupero(ricostruisci([rigaServer()]), ENTRY_KEY, 30);
    const riga1 = giro1.logWrites[0];
    expect(riga1.ora_ricalcolata).toBe(`${DATA}T17:00`);

    // Refeed the produced row as the mirror row of the next rebuild. This is
    // the offline case: no server reread ever contradicts it.
    const piano2 = ricostruisci([riga1]);
    const e2 = piano2[0];
    expect(e2.ora_ricalcolata).toBe(`${DATA}T17:00`);
    expect(e2.ora_ricalcolata_originale).toBeNull(); // still not rebuilt

    const giro2 = applyRecupero(piano2, ENTRY_KEY, 30);
    // 17:30 -> 17:00 -> 16:30. The dose walks BACKWARDS one step per
    // confirmation, shortening the interval from the previous dose (M1),
    // while the same total 30 keeps travelling to the server.
    expect(giro2.logWrites[0].ora_ricalcolata).toBe(`${DATA}T16:30`);
    expect(giro2.logWrites[0].recupero_minuti).toBe(30);
  });

  // ---------- F5 -- gap_originale: inerzia, non esposizione ----------
  // SENTINEL_MCC_F5_INERZIA
  it('F5: gap_originale non ricostruito e INERTE, il ritardo residuo resta corretto', () => {
    const entry = ricostruisci([rigaServer()])[0];
    expect(entry.gap_originale).toBe(0);
    expect(entry.gap_minuti).toBe(60);

    const { getAllByText, unmount } = montaModulo(entry);

    // RecuperoModal.jsx :93 computes residualGap from `gap_minuti`, never
    // from the snapshot: 60 - 30 = 30, correct DESPITE gap_originale being 0.
    // Two nodes carry "30 min": the cursor value and the residual block.
    // Had any sede read the snapshot, residualGap would be -30, the block
    // would render the aligned label instead, and this count would be 1.
    expect(getAllByText('30 min')).toHaveLength(2);

    unmount();
  });

  // ---------- CONTROLLO POSITIVO ----------
  // Without this, a red above would not prove it comes from the
  // RECONSTRUCTION rather than from the fixture itself (LC-93: the shape
  // must be faithful precisely on the trait that matters).
  // SENTINEL_MCC_CTRL_POSITIVO
  it('CONTROLLO POSITIVO: con lo snapshot presente la base e quella giusta', () => {
    const entry = {
      ...ricostruisci([rigaServer()])[0],
      ora_ricalcolata_originale: `${DATA}T18:00`,
    };
    const { getByText, getByTestId, unmount } = montaModulo(entry);

    expect(getByText('18:00')).toBeTruthy();
    expect(getByTestId('new-time')).toHaveTextContent('17:30');

    unmount();
  });
});
