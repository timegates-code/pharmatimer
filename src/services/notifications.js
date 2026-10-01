// Wave B notifications service — singleton + factory.
//
// Design decisions (Sessione 9-B CP2 pre-codice §6.118):
//  Q-CP2.1: 7+1 metodi via factory createNotificationsService() per testabilità
//           (singleton di default + fresh instances nei test). DI in
//           rescheduleAllNotifications(state, services) per swap mock.
//  Q-CP2.2: click handler punta a '/oggi' (route principale dosi).
//           Superseded by decision 10 A of STATO_CORRENTE.md (2026-10-01):
//           the timers stay next to the Web Push channel, and the tap brings
//           the window forward without navigating it, the rule of
//           public/sw-push.js: a window may hold a form not yet saved, and an
//           absolute '/oggi' ignored the base of the GitHub Pages build.
//  Q-CP2.3: scheduleNotification con fireAt <= now → no-op silenzioso
//           (caller rescheduleAllNotifications può passare entries marginalmente
//           passate senza errore).
//  Q-CP2.4: defensive permission check dentro fire-callback del setTimeout
//           (rileva revoche iOS post-schedule, AMB-9.I "rileva revoche post-subscribe").
//  Q-CP2.5: beep audio.js NON gestito qui — orchestrato esternamente da
//           useAutoBeep (Sessione 7b-1, hook reattivo). notifications.js fa
//           solo Notification API + scheduling, no import audio.js.
//
// CP4 Sessione 9-B parte 2/2 — corrections to CP2 provisional decisions:
//  §6.127: rescheduleAllNotifications now uses selectEntriesForDay +
//          selectToday (was: state.pianoOggi || []). State shape verified
//          in CP4 pre-code: the canonical key is `state.plan` (multi-day),
//          and the Oggi-day projection lives in `selectEntriesForDay`.
//  §6.128: farmaco lookup via `selectFarmacoById(state, id)` (was:
//          `state.farmaci[entry.farmaco_id]` with array-as-dict access bug).
//          state.farmaci is a flat array; the dict access returned a
//          farmaco only by accidental id-equals-index coincidence.
//
// Tag-based replacement: schedulare stesso entryKey cancella il timer precedente
// (Q-CP2.3 + AMB-9.H). entryKey convenzione: dose-{farmaco_id}-{dose_numero}-{dateStr}.

import { istanteDose, testoDose } from '../domain/promemoria.js';
import {
  selectToday,
  selectEntriesForEffectiveDay,
  selectFarmacoById,
} from '../state/selectors.js';

// How long a fired timer is remembered: the plan's window, two days around today.
const FIRED_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Factory: builds a fresh notifications service instance.
 * The default export `notifications` is a singleton; tests build fresh
 * instances via createNotificationsService() to avoid cross-test bleed.
 */
export function createNotificationsService() {
  // Closure-private Map<entryKey, timeoutId>.
  const pending = new Map();
  // The timers already fired, `${entryKey}|${fireAt}` -> fireAt. Decision 10
  // A and Roberto's condition (2026-10-01): AppContext re-arms the timers at
  // every committed change of the plan, so a re-arm must never start again
  // the notification of a dose already shown. `delay <= 0` alone does not
  // hold it: a timer can fire a few ms before its instant by the wall clock,
  // and a re-arm in those ms would arm it again. One notification per dose
  // and instant: a dose moved to a new instant is armed for the new one.
  // cancelAll() leaves this memory alone, since every re-arm begins with it.
  const fired = new Map();

  function isSupported() {
    return typeof globalThis.Notification !== 'undefined';
  }

  function getPermission() {
    if (!isSupported()) return 'denied';
    return globalThis.Notification.permission || 'default';
  }

  function requestPermission() {
    if (!isSupported()) return Promise.resolve('denied');
    return globalThis.Notification.requestPermission();
  }

  function scheduleNotification({ entryKey, fireAt, title, body, onFire } = {}) {
    if (!isSupported()) return;
    if (!entryKey) return;
    const firma = `${entryKey}|${fireAt}`;
    if (fired.has(firma)) return; // already shown: a re-arm never starts it again
    const delay = fireAt - Date.now();
    if (delay <= 0) return; // Q-CP2.3=A: no-op silenzioso
    // Tag-based replacement: cancel previous timer for same entryKey.
    if (pending.has(entryKey)) {
      clearTimeout(pending.get(entryKey));
    }
    const timeoutId = setTimeout(() => {
      pending.delete(entryKey);
      fired.set(firma, fireAt);
      // Forget what fell out of the plan's window (ieri, oggi, domani).
      for (const [f, istante] of fired) {
        if (istante < fireAt - FIRED_RETENTION_MS) fired.delete(f);
      }
      // Q-CP2.4=A: defensive permission check al fire (cattura revoche post-schedule).
      if (globalThis.Notification.permission !== 'granted') return;
      // Chrome Android: `new Notification()` in page context always throws
      // TypeError ("Illegal constructor. Use
      // ServiceWorkerRegistration.showNotification() instead", MDN BCD
      // chrome_android partial). The object exists and `permission` answers,
      // so neither isSupported() nor the check above sees it coming. Without
      // this guard the throw took down the rest of the fire-callback and, with
      // it, every later timer of the same tick. The guard restores the
      // fail-safe: no notification on that platform is a KNOWN limit, a dead
      // chain is not. It changes nothing where the constructor works (iOS in
      // an installed PWA): same construction, same onclick, same onFire.
      try {
        const notif = new globalThis.Notification(title, { body, tag: entryKey });
        // Decision 10 A: the window comes forward as it is, never navigated.
        notif.onclick = () => {
          try { window.focus(); } catch { /* noop */ }
        };
      } catch { /* costruttore non disponibile in pagina: si prosegue */ }
      if (typeof onFire === 'function') {
        try { onFire(); } catch { /* swallow */ }
      }
    }, delay);
    pending.set(entryKey, timeoutId);
  }

  function cancelNotification(entryKey) {
    if (!pending.has(entryKey)) return;
    clearTimeout(pending.get(entryKey));
    pending.delete(entryKey);
  }

  function cancelAll() {
    for (const timeoutId of pending.values()) {
      clearTimeout(timeoutId);
    }
    pending.clear();
  }

  /**
   * Convenience wrapper for scheduling a dose-tagged notification.
   * Derives entryKey, fireAt, title, body from entry+farmaco.
   * - title, body = testoDose(entry, farmaco): the text of the push (decision 32 A)
   * - fireAt = istanteDose(entry): ora_ricalcolata (ISO) || ora_prevista on entry.dateStr
   * - entryKey = dose-{farmaco.id}-{entry.dose_numero}-{entry.dateStr}
   */
  function showDoseNotification(entry, farmaco) {
    if (!entry || !farmaco) return;
    const dateStr = entry.dateStr;
    // §6.138 (Sessione 9-B parte 4/4 hotfix, est.): dose_numero anche
    // nested sotto entry.orario (canonical shape, parallelo farmaco_id).
    const entryKey = `dose-${farmaco.id}-${entry.orario?.dose_numero}-${dateStr}`;
    // Decisione 1 (DST): wall time to instant through the single door, so a
    // dose planned in the skipped hour fires at the first existing instant
    // and a time in the double hour fires at its first occurrence. The
    // formula is istanteDose (domain/promemoria.js), the same the published
    // calendar uses, so the push and the page timer share their instant.
    // A dose without a time (P3, ora_prevista null) is never scheduled.
    const fireAt = istanteDose(entry);
    if (fireAt === null) return; // Defensive: no schedulable timestamp.
    // Decision 32 A: the text of the push, so a double reads as one dose.
    const { titolo, corpo } = testoDose(entry, farmaco);
    scheduleNotification({ entryKey, fireAt, title: titolo, body: corpo });
  }

  function getPendingCount() {
    return pending.size;
  }

  return {
    isSupported,
    getPermission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAll,
    showDoseNotification,
    getPendingCount,
  };
}

/**
 * Default singleton — used in production by AppContext (CP4).
 */
export const notifications = createNotificationsService();

/**
 * Pure exported function: cancel all pending notifications and reschedule
 * from the current plan state. Called from AppContext on 8 triggers
 * (AMB-9.G': init, commitApplyResult, rollover, cambiaProfilo, 7 thunks
 *  config, toggle on/off, visibility/focus).
 *
 * §6.127 (CP4): plan source is `selectEntriesForDay(state, selectToday(state))`.
 *               The canonical state key is `state.plan` (multi-day); the
 *               selector projects today-only entries.
 * Dose oltre la mezzanotte (M2): the window is `selectEntriesForEffectiveDay`,
 *               not the raw `dateStr` filter. `cancelAll` + reschedule ran on
 *               `dateStr === today` only, so a dose planned yesterday and
 *               recalculated into today was cancelled at the first rollover
 *               (or visibilitychange) and never rearmed. The union is a
 *               superset: a dose recalculated OUT of today keeps its timer.
 * §6.128 (CP4): farmaco lookup via `selectFarmacoById(state, id)` (state.farmaci
 *               is an array, not a dict — pre-CP4 dict-access was a silent bug).
 *
 * Filters: stato ∈ {'prevista','ricalcolata'} (skips presa/saltata/sospesa).
 * Skips entries without a corresponding farmaco in state.farmaci.
 * Skips entries with fireAt <= now (handled by scheduleNotification no-op).
 *
 * @param {object} state — full AppState; must have `status === 'ready'`
 *                         (caller in AppContext gates on this).
 * @param {object} services — notifications service (DI for testability).
 */
export function rescheduleAllNotifications(state, services) {
  if (!state || !services) return;
  services.cancelAll();
  const today = selectToday(state);
  const entries = selectEntriesForEffectiveDay(state, today);
  for (const entry of entries) {
    if (entry.stato !== 'prevista' && entry.stato !== 'ricalcolata') continue;
    // §6.138 (Sessione 9-B parte 4/4 hotfix): entry shape canonico
    // espone farmaco_id sotto entry.orario, non flat su entry.
    const farmaco = selectFarmacoById(state, entry.orario?.farmaco_id);
    if (!farmaco) continue;
    services.showDoseNotification(entry, farmaco);
  }
}
