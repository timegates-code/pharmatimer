// ============================================================
// Action creators — async thunks closing over {dispatch, getState, repo}.
// All domain work stays pure (recalc/planBuilder); thunks orchestrate
// I/O (repo) and state transitions (dispatch).
// See Changelog Fase 2 §11 (AMB-5b2, AMB-6) + §13 + §6.27 (AMB-7a.M).
// ============================================================

import {
  applyAssunzione,
  applySalto,
  applySospensione,
  applyRecupero,
  applyRipristino,
  applyAnnullaAssunzione,
  ricalcolaPianoDaProfilo,
} from '../domain/recalc.js';
import { buildMultiDayPlan } from '../domain/planBuilder.js';
// CP4 par.6.172/175: opt-in seed loader for completeOnboarding('demo').
import { runSeedIfNeeded } from '../data/seed.js';
// CP6 v3.0.0 Step 1 (§6.180-181): direct db access for resetAllData
// thunk transaction (clear+re-add atomic). The repo abstraction does
// not expose a clear-all primitive, and adding one for a single
// 1-shot use-case would be scope-creep. Documented as deviation.
import { db, ONBOARDING_LS_KEY } from '../data/db.js'; // BUG-m fix s.6.251
import { addDays } from '../utils/time.js';
import { resolveNow } from '../utils/now.js';
import {
  PLAN_DAYS_BEFORE,
  PLAN_DAYS_AFTER,
  PLAN_TOTAL_DAYS,
  GET_FARMACI_SOLO_ATTIVI,
  // SENTINEL_QOCT_IMPORT_THROTTLE
  DRAIN_THROTTLE_MS,
} from '../domain/constants.js';
import { selectToday, selectProfiloById } from './selectors.js';
import { commitApplyResult } from './applyHelper.js';
// SENTINEL_QTIRANTE_IMPORT_ACTIONS
import { raccogliCoda } from './coda.js';
import { rescheduleAllNotifications } from '../services/notifications.js';

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------
// NOTE: `resolveNow` used to live here as a private helper.
// It was extracted to `src/utils/now.js` in Sessione 6 (AMB-6.A)
// so that the hook `useNow`, selectors and thunks share a single
// source of truth for "now" resolution.

/**
 * Convert an array of {chiave, valore} rows (as returned by repo.getAllSettings)
 * into a plain object keyed by `chiave`. Handles both shapes defensively:
 *   - Array<{chiave, valore}> → { chiave: valore, ... }
 *   - Plain object            → returned as-is
 *   - null / undefined        → {}
 */
function normaliseSettingsDict(raw) {
  if (raw == null) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const row of raw) {
      if (row && typeof row.chiave === 'string') {
        out[row.chiave] = row.valore;
      }
    }
    return out;
  }
  if (typeof raw === 'object') return { ...raw };
  return {};
}

/**
 * Derive an entry key from a log row's composite identity.
 *
 * The canonical formula lives in `src/domain/planBuilder.js` (see also
 * `src/domain/recalc.test.js:61` for the test-side assertion):
 *     key = `${dateStr}-${farmaco.id}-${orario.dose_numero}`
 *
 * Log rows use snake_case names (`farmaco_id`, `data`, `dose_numero`); the
 * same pair `(farmaco.id, orario.dose_numero)` is already threaded across
 * both worlds by `cambiaProfilo` when computing `logsToDelete`. Centralising
 * the translation here keeps the mapping in one obvious spot and makes the
 * eventual promotion to a shared `makeEntryKey(...)` helper a trivial move.
 */
function logRowToEntryKey(logRow) {
  return `${logRow.data}-${logRow.farmaco_id}-${logRow.dose_numero}`;
}

// ------------------------------------------------------------
// Thunk factory
// ------------------------------------------------------------

/**
 * Default no-op services bag — used when callers (e.g. legacy tests)
 * invoke `createActions` without the `services` parameter. The shape
 * mirrors the production singleton from `services/notifications.js`
 * but every method is a no-op. §6.126 (Sessione 9-B parte 2/2).
 */
/**
 * Normalise a time-ish field to a comparable 'HH:MM' string.
 * SENTINEL_S2C1_PRESOSTACK_SORT
 *
 * The same clinical instant reaches us in three shapes depending on the
 * write path that produced the row:
 *   'HH:MM'                 domain writes (PWA local)
 *   'HH:MM:SS'              MySQL TIME through the API
 *   'YYYY-MM-DDTHH:MM:SS'   MySQL DATETIME through the API
 *
 * A raw lexicographic compare ACROSS shapes is wrong: '08:05' sorts
 * before '2026-07-23T08:05:00' because '0' < '2'. Ordering must never
 * depend on which shape a row happens to carry, so every candidate is
 * reduced to 'HH:MM' first.
 *
 * @param {unknown} value
 * @returns {string} 'HH:MM', or '' when there is nothing comparable.
 */
function toComparableTime(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  const tIdx = value.indexOf('T');
  const sepIdx = tIdx >= 0 ? tIdx : value.indexOf(' ');
  const timePart = sepIdx >= 0 ? value.slice(sepIdx + 1) : value;
  return timePart.slice(0, 5);
}

function defaultNoopServices() {
  return {
    notifications: {
      isSupported: () => false,
      getPermission: () => 'default',
      requestPermission: () => Promise.resolve('default'),
      scheduleNotification: () => {},
      cancelNotification: () => {},
      cancelAll: () => {},
      showDoseNotification: () => {},
      getPendingCount: () => 0,
    },
  };
}

/**
 * Build the action bag bound to the provider's dispatch/getState/repo/services.
 * @param {{
 *   dispatch: (a: {type: string, payload?: any}) => void,
 *   getState: () => import('./reducer.js').AppState,
 *   repo: any,
 *   services?: { notifications: any },
 * }} deps
 */
export function createActions({ dispatch, getState, repo, services = defaultNoopServices() }) {

  // §6.126 — Centralised reschedule helper. Called from every thunk
  // that mutates plan-relevant state (apply* dose actions, cambioProfilo,
  // 7 thunks Config, setSetting toggle on). Gates on:
  //   - state.status === 'ready' (otherwise plan/farmaci may be empty)
  //   - state.impostazioni.notifiche_attive === 1 (master switch)
  // AMB-9.E' (sincrona idempotente cancel-then-rebuild atomico): the
  // helper executes synchronously inside the calling microtask, so
  // back-to-back calls from rapid dispatches are safe.
  function maybeReschedule(state) {
    if (!state || state.status !== 'ready') return;
    if (state.impostazioni?.notifiche_attive !== 1) return;
    rescheduleAllNotifications(state, services.notifications);
  }


  // SENTINEL_QOCT_DRAIN_THUNK
  // Q-QSEPT-3=A / Q-QSEPT-5=A / Q-QSEPT-7=A -- trigger-driven drain
  // (Spec 14.2, triggers 1..4). Called from the tail of init() and from
  // the three event handlers in AppContext.
  //
  // Throttled at DRAIN_THROTTLE_MS. The throttle deliberately does NOT
  // cover the write-path drain, which lives inside the guardian and must
  // stay immediate (Spec 14.2.5): the two lines of Spec are compatible
  // only this way.
  //
  // NEVER throws, in ANY branch. It is awaited inside the try of init(),
  // so an escaping rejection would dispatch INIT_ERROR over an already
  // emitted INIT_SUCCESS -- a delivery hiccup turned into a broken boot.
  // The queue is intact by construction (Spec 14.3): nothing is lost,
  // the next trigger retries.
  let lastDrainAt = 0;

  // SENTINEL_QTARGA_CONTA_SICURO
  // Q-TARGA-2=B / Q-TARGA-3=A -- guarded read of the notice count.
  //
  // The guard is NOT prudence, it is MEASURED: getRepository() returns a
  // bare LocalRepository when the API flag is off (index.js :53-59), and
  // that class carries no `contaAvvisi`. A naked call would throw a
  // TypeError inside a thunk whose contract is NEVER throws, in ANY
  // branch -- and an escaping rejection here dispatches INIT_ERROR over an
  // already emitted INIT_SUCCESS, turning a delivery hiccup into a broken
  // boot. That is M2, not a robustness nicety.
  //
  // Absence degrades to 0 BEFORE and 0 AFTER, so the predicate below falls
  // back exactly to the pre-repair behaviour instead of misfiring. A
  // future async variant degrades the same way: a Promise is not a number.
  function contaAvvisiSicuro() {
    try {
      const n = repo.contaAvvisi?.();
      return typeof n === 'number' ? n : 0;
    } catch {
      return 0;
    }
  }

  async function drainOutbox() {
    const now = Date.now();
    // Stamped BEFORE the pass, not after: a pass that takes long must not
    // let the next trigger start a second one. Overlap is guarded again on
    // the repository side (Q-QSEPT-3=A); two guards here are cheap.
    if (now - lastDrainAt < DRAIN_THROTTLE_MS) return 0;
    lastDrainAt = now;

    // Read AFTER the throttle gate, so a throttled call pays no store
    // scan; and BEFORE the pass, because the pass is what writes.
    const avvisiPrima = contaAvvisiSicuro();

    let delivered = 0;
    try {
      delivered = await repo.drainOutbox();
    } catch {
      // SENTINEL_QTIRANTE_RACCOLTA_CATCH
      // The NOTICE count is deliberately NOT consulted here: on an already
      // degraded path no new call is added (perimeter declared at
      // par.22.198-quatersexagies). The QUEUE count is a different matter
      // and IS collected (Q-TIRANTE-4=A): a pass that parked elements and
      // then rejected has changed `parked`, and leaving that unread paints
      // an empty parking lot over occupied slots, which is M2. The
      // collector never throws and dispatches nothing when it cannot read.
      await raccogliCoda({ dispatch, repo });
      return 0;
    }
    const avvisiDopo = contaAvvisiSicuro();

    // SENTINEL_QTIRANTE_RACCOLTA_THUNK
    // Q-RINTOCCO-3=A. The pass has just mutated the queue, so the parking
    // lot is read HERE and not inside `_drainOutbox` (Q-RINTOCCO-1=A): a
    // pass is one of the queue's mutators, not the queue's state, and the
    // day Riprova / Elimina of 14.5.3 move `parked` outside a pass an
    // observer seated in the mutator would go blind in silence (voce 220).
    await raccogliCoda({ dispatch, repo });

    // SENTINEL_QTARGA_PREDICATO
    // Q-LEVA-2=A. Spec 14.3 :1115 puts the plan-window reread FIRST among
    // the three acts of the Chiusura del giro, and prescribes it `a coda
    // percorsa` -- with NO condition on what was delivered. On the trigger
    // path `delivered === 0` conflates FIVE routes (empty queue, failed
    // local read, no progress, halted, broken Dexie), where an empty queue
    // is the normal case and a dropped element is the EXPOSED one: that
    // gate alone missed exactly the case that matters. A notice is written
    // in ONE of the three 409 outcomes (s.6.273) and that outcome IS the
    // drop, so the count across the pass is an EXACT discriminant and not
    // a heuristic.
    //
    // Unconditional was rejected: DRAIN_THROTTLE_MS is 60_000, so it would
    // mean 1440 plan rebuilds a day at an empty queue. The narrowing costs
    // nothing clinically, because at an empty queue `touched` is empty and
    // there is nothing stale to realign.
    //
    // RESIDUE, declared and not hidden: a count has a window. If the person
    // clears a notice with `Ho letto` while the drop writes one, the delta
    // can come out null. M1 stays covered -- the mirror is already
    // realigned inside `_drainOutbox` in a SINGLE seat, and the targa makes
    // the server dedupe -- so the residue is plan staleness in React until
    // the next trigger, never a double dose.
    if (delivered > 0 || avvisiDopo > avvisiPrima) {
      // Q-QSEPT-7=A: a trigger drain has no `logs` in hand, so the mirror
      // is realigned by rebuilding the plan. ADVISORY, like
      // _refreshTouchedWindow: its failure can never fail a touch that is
      // already annotated.
      try {
        await rebuildPlan();
      } catch {
        // advisory only
      }
    }
    return delivered;
  }

  // ----------------------------------------------------------
  // init / rebuildPlan
  // ----------------------------------------------------------

  async function init() {
    dispatch({ type: 'INIT_START' });
    try {
      // SENTINEL_QOBLO_RACCOLTA_INIT
      // Q-LUCERNA-3=A plus Q-OBLO-2=A. The collection is ANTICIPATED here
      // because `ready` arrives before any pass: INIT_SUCCESS below fires
      // long before the `drainOutbox()` that closes this try, so without
      // this line the slice would stay `null` for the whole boot and the
      // indicator would be mute while elements sit in the queue.
      // INSIDE the try and not above it (Q-OBLO-2=A): the collector never
      // throws today, but resting on a property of the CALLEE means the
      // guard vanishes in silence the day someone touches coda.js. Here
      // any surprise becomes INIT_FAILED, a path already normed, instead
      // of leaving init() without SUCCESS and without FAILED -- the app
      // frozen on `idle`, where the person cannot register at all: M2.
      await raccogliCoda({ dispatch, repo });

      const [profili, farmaci, orari, allSettings] = await Promise.all([
        repo.getProfili(),
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
        repo.getAllSettings(),
      ]);

      const impostazioni = normaliseSettingsDict(allSettings);

      const profiloAttivo = profili.find((p) => p.attivo);
      if (!profiloAttivo) {
        throw new Error('NO_ACTIVE_PROFILE');
      }

      const today = selectToday(getState());
      const startDate = addDays(today, -PLAN_DAYS_BEFORE);
      const endDate = addDays(today, PLAN_DAYS_AFTER);
      const logAssunzioni = await repo.getLogByRange(startDate, endDate);

      const plan = buildMultiDayPlan({
        profilo: profiloAttivo,
        farmaci,
        orari,
        logAssunzioni,
        startDate,
        numDays: PLAN_TOTAL_DAYS,
      });

      dispatch({
        type: 'INIT_SUCCESS',
        payload: {
          impostazioni,
          profili,
          profiloAttivo,
          farmaci,
          orari,
          plan,
          lastBuiltForDay: today,
        },
      });

      // Sessione 8-pre (§6.72, supersedes §6.40): rehydrate presoStack
      // with the keys of every 'presa' log in the window
      // [today - PLAN_DAYS_BEFORE, ..., today]. Preserves UNDO direct
      // affordance across cross-day reloads — a press registered
      // yesterday must remain tappable today via UndoModal.
      //
      // Source optimization (§6.75): we reuse `logAssunzioni` already
      // fetched above for buildMultiDayPlan instead of issuing a
      // dedicated range query. `logAssunzioni` covers
      // [today - PLAN_DAYS_BEFORE, today + PLAN_DAYS_AFTER], a strict
      // superset of the presoStack window, so the in-memory filter
      // below is equivalent to a dedicated query and cheaper.
      //
      // Filter semantics:
      //   - stato === 'presa' (other states are irrelevant to UNDO)
      //   - data >= startPresoDate (left bound of the window)
      //   - data <= today (exclude any future-dated 'presa' entries
      //     that may theoretically live in logAssunzioni via
      //     PLAN_DAYS_AFTER; defensive guard)
      //
      // Sort order (par.22.198-tretriginties, Q-AUD-3 -> PC-3): the
      // repository guarantees NO order on either branch. The API path
      // returns arrays.flat() of a per-farmaco fan-out (farmaco-major);
      // the mirror returns Dexie `data` index order, ties by id. Neither
      // is chronological, so after a reload the top of presoStack was
      // not necessarily the most recent press, and `annulla ultima`
      // could hit a different dose than the user expects: a dose really
      // taken would go back to "to take" (M1) and the record would
      // diverge from the intent (M3).
      //
      // The stack is therefore ordered EXPLICITLY below, so the LIFO
      // convention (top = stack.at(-1) = most recent press) holds BY
      // CONSTRUCTION rather than by an assumption about the caller.
      //
      // Dispatched AFTER INIT_SUCCESS (not merged into its payload) to
      // keep the init shape change minimal and isolate this concern
      // in its own action. No-op if the filter result is empty.
      const startPresoDate = addDays(today, -PLAN_DAYS_BEFORE);
      const presaLogsInWindow = logAssunzioni
        .filter(
          (l) => l.stato === 'presa' && l.data >= startPresoDate && l.data <= today
        )
        .sort((a, b) => {
          if (a.data !== b.data) return a.data < b.data ? -1 : 1;
          const ta = toComparableTime(a.ora_effettiva ?? a.ora_prevista);
          const tb = toComparableTime(b.ora_effettiva ?? b.ora_prevista);
          if (ta !== tb) return ta < tb ? -1 : 1;
          return (a.dose_numero ?? 0) - (b.dose_numero ?? 0);
        });
      dispatch({
        type: 'SET_PRESO_STACK',
        payload: presaLogsInWindow.map(logRowToEntryKey),
      });

      // §6.126 — Trigger 1 (init): reschedule notifications after a
      // successful boot. No-op if notifiche_attive !== 1.
      maybeReschedule(getState());

      // SENTINEL_QOCT_INIT_DRAIN
      // Spec 14.2.1 -- trigger 1: init with a residual queue drains at
      // boot. Reached offline too, because init() succeeds by
      // construction (Spec 14.4.6: Profili and Impostazioni are local,
      // the three server-backed reads fall back to the mirror); there the
      // pass is suppressed inside the guardian by navigator.onLine.
      await drainOutbox();
    } catch (err) {
      // SENTINEL_N5QC_CP4BIS_INIT_PROPAGATE_CODE -- drift-N53: propaga err.code
      // (es. UNAUTHORIZED) cosi App puo auto-clear un token stale al reload.
      // Rami NO_ACTIVE_PROFILE + INIT_FAILED preservati (allineamento agli altri thunk).
      let code;
      let message;
      if (err?.message === 'NO_ACTIVE_PROFILE') {
        code = 'NO_ACTIVE_PROFILE';
        message = 'Nessun profilo attivo. Attivane uno per continuare.';
      } else if (err?.code) {
        code = err.code;
        message = err?.message ?? 'Errore di inizializzazione';
      } else {
        code = 'INIT_FAILED';
        message = err?.message ?? 'Errore di inizializzazione';
      }
      dispatch({
        type: 'INIT_ERROR',
        payload: { code, message },
      });
    }
  }

  async function rebuildPlan() {
    const state = getState();
    if (!state.profiloAttivo) return;
    try {
      const today = selectToday(state);
      const startDate = addDays(today, -PLAN_DAYS_BEFORE);
      const endDate = addDays(today, PLAN_DAYS_AFTER);
      const logAssunzioni = await repo.getLogByRange(startDate, endDate);
      const plan = buildMultiDayPlan({
        profilo: state.profiloAttivo,
        farmaci: state.farmaci,
        orari: state.orari,
        logAssunzioni,
        startDate,
        numDays: PLAN_TOTAL_DAYS,
      });
      dispatch({
        type: 'REBUILD_PLAN',
        payload: { plan, lastBuiltForDay: today },
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel ricalcolo del piano',
        },
      });
    }
  }

  // ----------------------------------------------------------
  // apply* thunks — optimistic via commitApplyResult
  // ----------------------------------------------------------

  async function presa(entryKey, override = undefined) {
    const { dateStr, hhmm } = resolveNow(getState());
    const input = {
      entryKey,
      dataEffettiva: override?.dataEffettiva ?? dateStr,
      oraEffettiva: override?.oraEffettiva ?? hhmm,
    };
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAssunzione(plan, input),
      op: 'presa',
      pushPresoKey: entryKey,
    });
    maybeReschedule(getState()); // §6.126 trigger 2.1
    return result;
  }

  async function salta(entryKey, override = undefined) {
    // override reserved for API symmetry; applySalto does not consume it today.
    void override;
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySalto(plan, entryKey),
      op: 'salta',
    });
    maybeReschedule(getState()); // §6.126 trigger 2.2
    return result;
  }

  async function sospendi(entryKey) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applySospensione(plan, entryKey),
      op: 'sospendi',
    });
    maybeReschedule(getState()); // §6.126 trigger 2.3
    return result;
  }

  async function recupero(entryKey, minuti) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRecupero(plan, entryKey, minuti),
      op: 'recupero',
    });
    maybeReschedule(getState()); // §6.126 trigger 2.4
    return result;
  }

  async function ripristina(entryKey, to) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyRipristino(plan, entryKey, to),
      op: 'ripristina',
    });
    maybeReschedule(getState()); // §6.126 trigger 2.5
    return result;
  }

  async function annullaUltima() {
    const stack = getState().presoStack;
    if (stack.length === 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'domain',
          severity: 'error',
          code: undefined,
          message: 'Nessuna azione da annullare',
        },
      });
      return { ok: false };
    }
    const entryKey = stack[stack.length - 1];
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAnnullaAssunzione(plan, entryKey),
      op: 'annullaUltima',
      popPresoKey: true,
    });
    maybeReschedule(getState()); // §6.126 trigger 2.6
    return result;
  }

  /**
   * Undo a specific assumption identified by entryKey (Sessione 7d-2 CP4,
   * Changelog Fase 2 §6.41 + §6.62). Unlike annullaUltima, this thunk does
   * NOT require the target to be on top of presoStack — the UndoModal can
   * trigger it from any Card currently in state 'presa'.
   *
   * On success dispatches REMOVE_PRESO_KEY to keep presoStack coherent.
   *
   * Guard DOWNSTREAM_USER_EDITS (§6.61): the pure domain function throws
   * DomainError when N+1 is 'presa' or 'sospesa'. commitApplyResult maps
   * DomainError to SET_ERROR with kind:'domain' preserving the code; UI
   * consumers read state.error.code to surface the banner.
   */
  async function annullaAssunzione(entryKey) {
    const result = await commitApplyResult({
      dispatch, getState, repo,
      domainCall: (plan) => applyAnnullaAssunzione(plan, entryKey),
      op: 'annullaAssunzione',
    });
    if (result.ok) {
      dispatch({ type: 'REMOVE_PRESO_KEY', payload: entryKey });
    }
    maybeReschedule(getState()); // §6.126 trigger 2.7
    return result;
  }

  // ----------------------------------------------------------
  // cambiaProfilo — pessimistic (persist first, dispatch after)
  // ----------------------------------------------------------

  async function cambiaProfilo(profilo) {
    try {
      const currentPlan = getState().plan;
      // ricalcolaPianoDaProfilo in recalc.js returns a bare Plan (array).
      // AMB-5b2.B: accept both shapes for future-proofing.
      const out = ricalcolaPianoDaProfilo(currentPlan, profilo);
      const newPlan = Array.isArray(out) ? out : out?.plan;
      if (!Array.isArray(newPlan)) {
        throw new Error('ricalcolaPianoDaProfilo: invalid return shape');
      }

      const logsToDelete = currentPlan
        .filter((e) => e.stato === 'ricalcolata')
        .map((e) => ({
          farmaco_id: e.farmaco.id,
          data: e.dateStr,
          dose_numero: e.orario.dose_numero,
        }));

      await repo.setProfiloAttivoConCleanup(profilo.id, logsToDelete);

      const profiliAggiornati = getState().profili.map((p) => ({
        ...p,
        attivo: p.id === profilo.id ? 1 : 0,
      }));

      dispatch({
        type: 'APPLY_CAMBIO_PROFILO',
        payload: {
          profiloAttivo: { ...profilo, attivo: 1 },
          profili: profiliAggiornati,
          plan: newPlan,
          lastBuiltForDay: selectToday(getState()),
        },
      });
      maybeReschedule(getState()); // §6.126 trigger 4 (cambioProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel cambio profilo',
        },
      });
      return { ok: false };
    }
  }

  // ----------------------------------------------------------
  // UI / settings
  // ----------------------------------------------------------

  function dismissPrompt() {
    dispatch({ type: 'DISMISS_PROMPT' });
  }

  /**
   * Optimistic generic setting update.
   *
   * Dispatch flow (post §6.77 cleanup): SET_IMPOSTAZIONE only — no
   * mirrored dispatch. `nome_utente` is treated exactly like any other
   * setting; consumers read via `selectImpostazione(state, 'nome_utente')`.
   *
   * On repo failure the optimistic SET_IMPOSTAZIONE is rolled back to
   * the previous value.
   */
  async function setSetting(chiave, valore) {
    const stateBefore = getState();
    const prevValore = stateBefore.impostazioni?.[chiave];

    // Optimistic dispatch — unique channel post §6.77.
    dispatch({ type: 'SET_IMPOSTAZIONE', payload: { chiave, valore } });

    try {
      await repo.setSetting(chiave, valore);

      // §6.126 — Wave B notifications toggle dispatch.
      // chiave === 'notifiche_attive' is the dedicated path (AMB-9.G'):
      //   - valore === 1 → schedule all dose notifications now (trigger 6)
      //   - valore === 0 → cancel all pending timers (trigger 7)
      // Other settings (tema, nome_utente, ...) MUST NOT trigger reschedule
      // — that scope was explicitly excluded from AMB-9.G'.
      //
      // §6.132 (CP4 hotfix Sessione 9-B parte 2/2): bypass
      // maybeReschedule's gate. The optimistic dispatch above queued
      // notifiche_attive=valore, but stateRef will not reflect that
      // until React commits + the stateRef-tracking useEffect runs
      // (one tick later). maybeReschedule reads stateRef.current and
      // would see the pre-toggle value, failing its gate. We know the
      // new value here from `valore`, so call reschedule directly.
      // plan + farmaci are unchanged by the SET_IMPOSTAZIONE dispatch,
      // so reading them via stateRef is safe even when stale.
      // status==='ready' guard kept inline as defensive measure
      // (the UI already gates setSetting on ready state).
      if (chiave === 'notifiche_attive') {
        if (valore === 1) {
          const stateNow = getState();
          if (stateNow.status === 'ready') {
            rescheduleAllNotifications(stateNow, services.notifications);
          }
        } else {
          services.notifications.cancelAll();
        }
      }
      return { ok: true };
    } catch (err) {
      // Rollback optimistic write. When the key didn't exist before we
      // still dispatch with `valore: prevValore (undefined)`; the reducer
      // spread-merge puts that key at `undefined`, which is fine — the
      // missing-key semantic is already handled by `selectImpostazione`
      // returning null for undefined.
      dispatch({
        type: 'SET_IMPOSTAZIONE',
        payload: { chiave, valore: prevValore },
      });
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel salvataggio impostazione',
        },
      });
      return { ok: false };
    }
  }

  function setSimulatedNow(hhmm) {
    dispatch({ type: 'SET_SIMULATED_NOW', payload: hhmm });
  }

  // ----------------------------------------------------------
  // Toast (CP5 v3.0.0 Step 1, §6.176-177)
  // ----------------------------------------------------------
  //
  // Synchronous dispatchers — no I/O. `key` is Date.now() so the
  // <Toast /> consumer can `useEffect([state.toast?.key])` to re-arm
  // the auto-dismiss timer when the same message is fired twice in
  // succession (key changes even when message is identical).
  //
  // §6.177: the trigger for Mit-C (post-aggiunta farmaco) lives in
  // FarmaciTab.commitSave caller-side, NOT in addFarmaco thunk. This
  // avoids contaminating the thunk with profiloAttivo dependency for
  // computeOraPrevista, and ensures the seed flow (runSeedIfNeeded
  // bypasses addFarmaco via direct bulkPut) does not trigger spurious
  // toasts on the 3 demo farmaci.

  function showToast(message) {
    dispatch({
      type: 'SHOW_TOAST',
      payload: { key: Date.now(), message },
    });
  }

  function dismissToast() {
    dispatch({ type: 'DISMISS_TOAST' });
  }

  function clearError() {
    dispatch({ type: 'CLEAR_ERROR' });
  }

  // ----------------------------------------------------------
  // Action bag
  // ----------------------------------------------------------


  // ----------------------------------------------------------
  // Profili CRUD thunks (AMB-8b.D / §11)
  // ----------------------------------------------------------
  //
  // Pessimistic pattern: await repo.* before dispatching the state
  // mutation. Ensures state.profili never reflects a write that did
  // not land in IndexedDB. Divergence from setSetting (optimistic) is
  // intentional — profili CRUD is low-frequency and correctness beats
  // perceived latency here.
  //
  // AMB-8b.E guard in updateProfilo: the `attivo` field is stripped
  // from the patch before repo.update. Activation flows exclusively
  // through cambiaProfilo / APPLY_CAMBIO_PROFILO (see attivaProfilo
  // wrapper in CP5). This closes the vulnerability where a buggy form
  // could toggle `attivo` via the generic update channel bypassing
  // the cleanup logic in setProfiloAttivoConCleanup (§6.20).

  async function addProfilo(data) {
    try {
      const toInsert = { ...data, attivo: 0 };
      const id = await repo.addProfilo(toInsert);
      const state = getState();
      const profiliAggiornati = [...state.profili, { ...toInsert, id }];
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });
      maybeReschedule(getState()); // §6.126 trigger 5.1 (addProfilo)
      return { ok: true, id };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel salvataggio profilo',
        },
      });
      return { ok: false };
    }
  }

  async function updateProfilo(id, patch) {
    // AMB-8b.E: strip `attivo` from patch. Destructuring with rest
    // handles both "attivo present" and "attivo absent" cleanly.
    const { attivo: _drop, ...safePatch } = patch;
    try {
      await repo.updateProfilo(id, safePatch);
      const state = getState();
      const profiliAggiornati = state.profili.map((p) =>
        p.id === id ? { ...p, ...safePatch } : p
      );
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });

      // Mirror active-profile field + rebuild plan if the edited
      // profilo is the currently active one (§6.64 reactive rebuild).
      //
      // §6.102 (CP6 Sessione 8d-A-continue, §6.95 preventive retrofit,
      // AMB-8d.D proactive coherence defence): feed the fresh profilo
      // directly to rebuildPlanFromFresh to bypass stateRef lag.
      // AppContext updates stateRef in a useEffect that runs one tick
      // AFTER the dispatch below; invoking the no-arg `rebuildPlan()`
      // here would read `state.profiloAttivo` stale (pre-edit
      // ora_colazione/pranzo/cena), producing a plan with outdated
      // timings until the next app reload. The same coherence issue
      // was fixed reactively for the farmaci thunks in 8c-2 CP6
      // (§6.95 hotfix); here it is applied proactively.
      //
      // Prompt §11 referenced "APPLY_CAMBIO_PROFILO" imprecisely —
      // the dispatch below is SET_PROFILO_ATTIVO (APPLY_CAMBIO_PROFILO
      // lives in `cambiaProfilo`, a separate flow with its own plan
      // path via `ricalcolaPianoDaProfilo`).
      if (state.profiloAttivo && id === state.profiloAttivo.id) {
        const nuovoProfiloAttivo = { ...state.profiloAttivo, ...safePatch };
        dispatch({
          type: 'SET_PROFILO_ATTIVO',
          payload: nuovoProfiloAttivo,
        });
        await rebuildPlanFromFresh({ profilo: nuovoProfiloAttivo });
      }

      maybeReschedule(getState()); // §6.126 trigger 5.2 (updateProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nell\'aggiornamento profilo',
        },
      });
      return { ok: false };
    }
  }

  async function deleteProfilo(id) {
    // AMB-8b.F: repo.deleteProfilo already raises the §6.5 guard Error
    // when the target is the active profilo. The thunk just catches and
    // routes to SET_ERROR — no duplicate guard here.
    try {
      await repo.deleteProfilo(id);
      const state = getState();
      const profiliAggiornati = state.profili.filter((p) => p.id !== id);
      dispatch({ type: 'SET_PROFILI', payload: profiliAggiornati });
      maybeReschedule(getState()); // §6.126 trigger 5.3 (deleteProfilo)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nell\'eliminazione profilo',
        },
      });
      return { ok: false };
    }
  }

  // ----------------------------------------------------------
  // Farmaci CRUD thunks (Sessione 8c-2 CP5 / §11 v2.5.28)
  // ----------------------------------------------------------
  //
  // Pessimistic pattern: all repo writes complete inside a
  // `withTransaction('rw', ['farmaci','orari_base'], ...)` scope
  // before state mutations are dispatched. Post-commit we refetch
  // BOTH farmaci AND orari (§6.93 — extended rationale below),
  // then dispatch SET_FARMACI + SET_ORARI, then rebuild the plan
  // via `rebuildPlanFromFresh` (§6.95 — stateRef-bypass below).
  //
  // §6.93 rationale: rebuildPlan reads state.orari to build the
  // multi-day plan. After replaceOrariForFarmaco(...) state.orari
  // is stale; a SET_FARMACI-only refresh (as the §11 prompt wrote
  // literally) would produce a plan based on pre-edit timings.
  // Refetching via repo.getAllOrari() + SET_ORARI keeps the state
  // coherent at zero UX cost. The reducer already exposes SET_ORARI
  // (reducer.js:164, introduced 8a CP4 alongside SET_FARMACI).
  //
  // §6.95 rationale (hotfix CP6 8c-2, scoperta durante browser step 4):
  // calling `await rebuildPlan()` right after SET_FARMACI/SET_ORARI
  // reads `stateRef.current`, which AppContext updates in a
  // `useEffect([state])` that runs one tick AFTER the dispatch.
  // Within the same microtask chain the thunk sees a state snapshot
  // that still excludes the freshly-written farmaco/orari — result:
  // the new med has zero entries in the plan. The fix keeps the
  // freshly-fetched `farmaci` + `orariAll` in local scope and feeds
  // them directly to `buildMultiDayPlan`, bypassing stateRef. Note:
  // `updateProfilo` (see above) has the same pattern but its active
  // profilo is spread into the dispatch payload so the observable
  // effect differs — retrofit candidate for 8d.
  //
  // Soft-delete invariant (§6.67): deleteFarmaco sets attivo=0 at
  // repo level. With GET_FARMACI_SOLO_ATTIVI=true (post-8c CP1),
  // the refetched farmaci list no longer includes the target; the
  // subsequent rebuild drops its doses from the plan. Orari rows
  // remain in IDB for Log Fase 3 consultation — their refetch
  // returns them, but planBuilder ignores orphaned orari whose
  // farmaco_id is not in farmaci.

  // §6.102 (CP6 Sessione 8d-A-continue): signature generalized from
  // `{farmaci, orari}` (both required) to `{profilo?, farmaci?, orari?}`
  // (all optional, stateRef fallback) to enable proactive coherence
  // defence for updateProfilo (§6.95 pattern, AMB-8d.D). Retrocompat
  // for the farmaci thunks (addFarmaco/updateFarmaco/deleteFarmaco):
  // they keep passing `{farmaci, orari}`, and `profilo` now reads from
  // stateRef via the fallback — this is correct because those thunks
  // do not mutate the profilo.
  async function rebuildPlanFromFresh({ profilo, farmaci, orari } = {}) {
    const state = getState();
    const targetProfilo = profilo ?? state.profiloAttivo;
    if (!targetProfilo) return;
    const targetFarmaci = farmaci ?? state.farmaci;
    const targetOrari = orari ?? state.orari;
    const today = selectToday(state);
    const startDate = addDays(today, -PLAN_DAYS_BEFORE);
    const endDate = addDays(today, PLAN_DAYS_AFTER);
    const logAssunzioni = await repo.getLogByRange(startDate, endDate);
    const plan = buildMultiDayPlan({
      profilo: targetProfilo,
      farmaci: targetFarmaci,
      orari: targetOrari,
      logAssunzioni,
      startDate,
      numDays: PLAN_TOTAL_DAYS,
    });
    dispatch({
      type: 'REBUILD_PLAN',
      payload: { plan, lastBuiltForDay: today },
    });
  }

  async function addFarmaco(farmacoData, orari) {
    // BUG-l F14 post-commit best-effort: commit and post-commit refresh are
    // separated. A successful withTransaction means the farmaco IS persisted,
    // so we MUST return {ok:true}; a failure in the post-commit refresh
    // (refetch / rebuildPlan / reschedule) is surfaced as a non-fatal warning
    // but never reports the save as failed (which caused silent duplicates).
    let newId;
    try {
      await repo.withTransaction('rw', ['farmaci', 'orari_base'], async () => {
        newId = await repo.addFarmaco({ ...farmacoData, attivo: 1 });
        if (Array.isArray(orari) && orari.length > 0) {
          await repo.replaceOrariForFarmaco(newId, orari);
        }
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel salvataggio farmaco',
        },
      });
      return { ok: false };
    }
    try {
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.4 (addFarmaco)
    } catch (postErr) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: 'warning',
          code: postErr?.code,
          message: postErr?.message ?? 'Farmaco salvato; aggiornamento vista non riuscito',
        },
      });
    }
    return { ok: true, id: newId };
  }

  async function updateFarmaco(id, patch, orari) {
    // BUG-l F14 post-commit best-effort: see addFarmaco. Commit success must
    // return {ok:true}; post-commit refresh failure is a non-fatal warning.
    try {
      await repo.withTransaction('rw', ['farmaci', 'orari_base'], async () => {
        await repo.updateFarmaco(id, patch);
        if (Array.isArray(orari)) {
          // Accept empty array (wipe all orari) for contract completeness;
          // the form UX prevents this but the repo supports it.
          await repo.replaceOrariForFarmaco(id, orari);
        }
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nell\'aggiornamento farmaco',
        },
      });
      return { ok: false };
    }
    try {
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.5 (updateFarmaco)
    } catch (postErr) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: 'warning',
          code: postErr?.code,
          message: postErr?.message ?? 'Farmaco aggiornato; aggiornamento vista non riuscito',
        },
      });
    }
    return { ok: true };
  }

  async function deleteFarmaco(id) {
    // Soft-delete (§6.67): repo sets attivo=0, log rows untouched.
    // No explicit transaction — single write, atomic at the row level.
    try {
      await repo.deleteFarmaco(id);
      const [farmaci, orariAll] = await Promise.all([
        repo.getFarmaci({ soloAttivi: GET_FARMACI_SOLO_ATTIVI }),
        repo.getAllOrari(),
      ]);
      dispatch({ type: 'SET_FARMACI', payload: farmaci });
      dispatch({ type: 'SET_ORARI', payload: orariAll });
      await rebuildPlanFromFresh({ farmaci, orari: orariAll });
      maybeReschedule(getState()); // §6.126 trigger 5.6 (deleteFarmaco)
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: err?.severity ?? 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nell\'eliminazione farmaco',
        },
      });
      return { ok: false };
    }
  }

  // AMB-8b.D / F3: thin wrapper that resolves id -> profilo via
  // selectProfiloById and delegates to cambiaProfilo(profilo).
  // Exists because cambiaProfilo accepts a whole profilo object
  // (scoperta operativa §22.7 #4), and the UI layer naturally has
  // the id from the drawer context — so centralising the resolution
  // here avoids pushing selector knowledge to consumers.
  //
  // Return contract: {ok: true} on success, {ok: false} on unresolved
  // id. cambiaProfilo itself has no explicit return; the wrapper adds
  // one for uniformity with add/update/delete thunks (callers can rely
  // on `if (result?.ok)` across all profili CRUD thunks).
  async function attivaProfilo(id) {
    const profilo = selectProfiloById(getState(), id);
    if (profilo == null) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'domain',
          severity: 'error',
          code: undefined,
          message: 'Profilo non trovato',
        },
      });
      return { ok: false };
    }
    await cambiaProfilo(profilo);
    // §6.126 trigger 5.7 (attivaProfilo) — Q2=A: explicit reschedule
    // here in addition to cambiaProfilo's own (trigger 4). The double
    // call on the wrapper path is accepted by AMB-9.E' (sincrona
    // idempotente cancel-then-rebuild atomico): two consecutive sync
    // executions cannot leak timers (JS single-threaded; cancelAll
    // empties the Map before each rebuild loop).
    maybeReschedule(getState());
    return { ok: true };
  }

  // §6.142 — scheduleTestDose: smoke test thunk per validazione runtime
  // del flusso notifications (CP browser §11 P1-P5+P8 Sessione 9-B parte 5/5).
  // Crea entry sintetica con ora_prevista = now + minutesFromNow nel wall
  // clock reale, bypassando il limite §6.141 (simulatedNow non propaga ai
  // setTimeout). Bypassa intenzionalmente il gate maybeReschedule
  // (notifiche_attive=1 non è prerequisito): il chiamante controlla il
  // toggle quando invoca via Console (`__pt.app.actions.scheduleTestDose(5)`).
  // Shape entry post-§6.138: orario.{farmaco_id, dose_numero} nested.
  // dose_numero=999 sentinel garantisce entryKey stabile per (farmaco, day),
  // quindi 2× invocazioni con stesso farmacoId collassano via tag-as-Map-key
  // del singleton notifications (validazione P8).
  async function scheduleTestDose(minutesFromNow = 5, opts = {}) {
    const state = getState();
    if (state.status !== 'ready') {
      throw new Error('NOT_READY');
    }
    const farmaci = state.farmaci;
    if (!farmaci || farmaci.length === 0) {
      throw new Error('NO_FARMACI');
    }
    const farmaco = opts.farmacoId
      ? farmaci.find((f) => f.id === opts.farmacoId)
      : farmaci[0];
    if (!farmaco) {
      throw new Error('FARMACO_NOT_FOUND');
    }

    const today = selectToday(state);
    const fireAtMs = Date.now() + minutesFromNow * 60_000;
    const fireDate = new Date(fireAtMs);
    const hh = String(fireDate.getHours()).padStart(2, '0');
    const mm = String(fireDate.getMinutes()).padStart(2, '0');
    const ora_prevista = `${hh}:${mm}`;

    const syntheticEntry = {
      dateStr: today,
      orario: { farmaco_id: farmaco.id, dose_numero: 999, offset_minuti: 0 },
      farmaco,
      ora_prevista,
      ora_ricalcolata: null,
      stato: 'prevista',
    };

    // §6.145: build fresh state explicitly. Re-reading via getState()
    // here yields STALE state because dispatch updates stateRef in a
    // useEffect one tick later (pattern §6.95/§6.102 from updateProfilo).
    // The synthetic entry would be invisible to the rescheduler otherwise.
    const newPlan = [...state.plan, syntheticEntry];
    dispatch({ type: 'SET_PLAN', payload: newPlan });
    const freshState = { ...state, plan: newPlan };
    rescheduleAllNotifications(freshState, services.notifications);
    return { ok: true, ora_prevista, farmacoId: farmaco.id };
  }

  /**
   * §6.168 (CP2 v3.0.0 Step 1) — Onboarding completion thunk.
   *
   * Captures `nome_utente` (if non-empty after trim) and flips the
   * `onboarding_completed` gating flag. Reuses the local `setSetting`
   * thunk for IDB persistence + optimistic dispatch + rollback on
   * repo failure (no duplicate I/O logic).
   *
   * `mode='demo'` is a no-op in CP2: the demo seed is allocated to
   * CP4 (par.6.168 carry-over). The mode argument is validated and
   * stored in scope but does not trigger any side-effect here.
   *
   * @param {string} nome    User-typed name (will be trimmed; empty
   *                         skips the nome_utente write).
   * @param {'empty'|'demo'} mode  Onboarding outcome.
   * @returns {Promise<{ok: true} | {ok: false}>}
   */
  async function completeOnboarding(nome, mode) {
    if (mode !== 'empty' && mode !== 'demo') {
      throw new Error(`completeOnboarding: invalid mode "${mode}"`);
    }

    const trimmed = (nome ?? '').trim();
    if (trimmed.length > 0) {
      const r = await setSetting('nome_utente', trimmed);
      if (!r?.ok) return r;
    }

    const r2 = await setSetting('onboarding_completed', 1);
    if (!r2?.ok) return r2;

    // BUG-m fix (s.6.251): mirror the flag to localStorage so the
    // OnboardingGate survives mobile reloads where IndexedDB is wiped
    // (Finding #10). Best-effort: storage failures must not block
    // onboarding (IDB flag above remains authoritative in-session).
    // SENTINEL_BUGM_S6251_COMPLETE_LS
    try {
      localStorage.setItem(ONBOARDING_LS_KEY, '1');
    } catch {
      /* ignore storage errors */
    }

    // par.6.168 closure (CP4 par.6.175): demo seed via opt-in.
    if (mode === 'demo') {
      try {
        await runSeedIfNeeded({ force: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('completeOnboarding: seed demo failed', err);
        // Non blocking: onboarding_completed gia settato, app procede.
      }
    }

    return { ok: true };
  }

  /**
   * §6.180 (CP6 v3.0.0 Step 1) — "Ricomincia da capo" reset thunk.
   *
   * Atomic wipe + re-init. Triggered by SezioneDati in ImpostazioniTab
   * after user confirms the danger ConfirmModal (Q-UX.7 §22.41).
   *
   * Flow:
   *   1. db.transaction('rw', 5 stores, ...): clear all user-mutable
   *      tables AND profilo_utente, then re-add a default "Standard"
   *      profilo with attivo:1. The re-add inside the same transaction
   *      avoids the NO_ACTIVE_PROFILE error that would otherwise be
   *      raised by init() on a profili-empty DB.
   *   2. await init(): re-reads everything from the now-empty (except
   *      Standard profilo) DB, dispatches INIT_SUCCESS with empty
   *      farmaci/orari/plan + impostazioni={}. presoStack also cleared
   *      via SET_PRESO_STACK with empty array (init filters by date
   *      range; logAssunzioni is empty post-wipe).
   *   3. OnboardingGate (App.jsx) automatically reopens: it watches
   *      `selectImpostazione(state, 'onboarding_completed')`, which is
   *      now null (key absent from impostazioni_app cleared in step 1),
   *      so the gate condition `null !== 1` becomes true and the
   *      OnboardingModal is mounted.
   *
   * §6.181 — Direct db access (db.transaction) instead of going through
   * `repo.withTransaction`. Rationale: clear+re-add is a one-shot
   * operation that does not warrant adding a `clearAllData()` method
   * to IRepository (which would propagate to LocalRepository,
   * eventually ApiRepository, with attendant test surface). The
   * deviation is contained inside this thunk and documented inline.
   *
   * Defensive DISMISS_PROMPT before init() guards against a stale
   * gap_recovery prompt whose entryKey no longer resolves post-wipe.
   */
  async function resetAllData() {
    try {
      await db.transaction(
        'rw',
        db.farmaci, db.orari_base, db.log_assunzioni,
        db.impostazioni_app, db.profilo_utente, db.outbox,
        async () => {
          await db.farmaci.clear();
          await db.orari_base.clear();
          await db.log_assunzioni.clear();
          await db.impostazioni_app.clear();
          await db.profilo_utente.clear();
          await db.outbox.clear(); // SENTINEL_PAR_22_198_SEPTVICIES_WIPE_OUTBOX (6.205 cross-path)
          // Re-add default "Standard" profilo so init() finds an
          // attivo profile (else throws NO_ACTIVE_PROFILE → INIT_ERROR
          // → OnboardingGate cannot open since gate requires status
          // === 'ready'). Defaults match the seed.js neutral profile
          // (§6.173 CP4 v3.0.0): same canonical Mediterranean rhythm
          // a generic user might recognise.
          await db.profilo_utente.add({
            id: 1, // §6.205: explicit id=1 mirrors §6.196 "Standard is id=1 by-design" convention also post-reset. Dexie clear() does NOT reset the IDB auto-increment counter, so without this id-explicit, post-reset add() could yield id>1 and a subsequent runSeedIfNeeded bulkPut (§6.202 fix) would INSERT instead of REPLACE — re-introducing the double-profile bug §6.201 via the reset+ri-onboarding-demo path.
            nome_profilo: 'Standard',
            ora_sveglia: '07:00',
            ora_colazione: '07:30',
            ora_pranzo: '13:00',
            ora_cena: '20:30',
            ora_sonno: '23:30',
            attivo: 1,
            demo: 0,
          });
        }
      );
      // BUG-m fix (s.6.251): clear the localStorage mirror so the
      // onboarding wizard re-opens after a full reset, preserving the
      // §6.180 "Ricomincia da capo" contract (step 3 of its flow).
      // SENTINEL_BUGM_S6251_RESET_LS
      try {
        localStorage.removeItem(ONBOARDING_LS_KEY);
      } catch {
        /* ignore storage errors */
      }
      // Defensive prompt clear before re-init (any open prompt is now
      // semantically stale — its entryKey no longer resolves).
      dispatch({ type: 'DISMISS_PROMPT' });
      await init();
      return { ok: true };
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          kind: 'repo',
          severity: 'error',
          code: err?.code,
          message: err?.message ?? 'Errore nel reset dei dati',
        },
      });
      return { ok: false };
    }
  }

  return {
    init,
    rebuildPlan,
    // SENTINEL_QOCT_BAG
    drainOutbox,
    addProfilo,
    updateProfilo,
    deleteProfilo,
    attivaProfilo,
    addFarmaco,
    updateFarmaco,
    deleteFarmaco,
    presa,
    salta,
    sospendi,
    recupero,
    ripristina,
    annullaUltima,
    annullaAssunzione,
    cambiaProfilo,
    dismissPrompt,
    setSetting,
    completeOnboarding,
    setSimulatedNow,
    scheduleTestDose,
    // CP5 v3.0.0 Step 1 (§6.176-177) — Toast Mit-C dispatchers.
    showToast,
    dismissToast,
    clearError,
    // CP6 v3.0.0 Step 1 (§6.180-181) — "Ricomincia da capo" reset.
    resetAllData,
  };
}
