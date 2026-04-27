// Wave B notifications service — singleton + factory.
//
// Design decisions (Sessione 9-B CP2 pre-codice §6.118):
//  Q-CP2.1: 7+1 metodi via factory createNotificationsService() per testabilità
//           (singleton di default + fresh instances nei test). DI in
//           rescheduleAllNotifications(state, services) per swap mock.
//  Q-CP2.2: click handler punta a '/oggi' (route principale dosi).
//  Q-CP2.3: scheduleNotification con fireAt <= now → no-op silenzioso
//           (caller rescheduleAllNotifications può passare entries marginalmente
//           passate senza errore).
//  Q-CP2.4: defensive permission check dentro fire-callback del setTimeout
//           (rileva revoche iOS post-schedule, AMB-9.I "rileva revoche post-subscribe").
//  Q-CP2.5: beep audio.js NON gestito qui — orchestrato esternamente da
//           useAutoBeep (Sessione 7b-1, hook reattivo). notifications.js fa
//           solo Notification API + scheduling, no import audio.js.
//  Q-CP2.6: rescheduleAllNotifications itera state.pianoOggi || [] e
//           state.farmaci || {}. Nome chiave provvisorio, da confermare in CP4.
//
// Tag-based replacement: schedulare stesso entryKey cancella il timer precedente
// (Q-CP2.3 + AMB-9.H). entryKey convenzione: dose-{farmaco_id}-{dose_numero}-{dateStr}.

import { formatRelazionePastoCopy } from '../utils/copy';

/**
 * Factory: builds a fresh notifications service instance.
 * The default export `notifications` is a singleton; tests build fresh
 * instances via createNotificationsService() to avoid cross-test bleed.
 */
export function createNotificationsService() {
  // Closure-private Map<entryKey, timeoutId>.
  const pending = new Map();

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
    const delay = fireAt - Date.now();
    if (delay <= 0) return; // Q-CP2.3=A: no-op silenzioso
    // Tag-based replacement: cancel previous timer for same entryKey.
    if (pending.has(entryKey)) {
      clearTimeout(pending.get(entryKey));
    }
    const timeoutId = setTimeout(() => {
      pending.delete(entryKey);
      // Q-CP2.4=A: defensive permission check al fire (cattura revoche post-schedule).
      if (globalThis.Notification.permission !== 'granted') return;
      const notif = new globalThis.Notification(title, { body, tag: entryKey });
      // Q-CP2.2=A: click handler porta su /oggi.
      notif.onclick = () => {
        try { window.focus(); } catch { /* noop */ }
        try { window.location.href = '/oggi'; } catch { /* noop */ }
      };
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
   * - title = farmaco.nome
   * - body = formatRelazionePastoCopy(farmaco) || 'Promemoria farmaco'
   * - fireAt = entry.ora_ricalcolata (ISO) || compose(entry.dateStr, entry.ora_prevista)
   * - entryKey = dose-{farmaco.id}-{entry.dose_numero}-{entry.dateStr}
   */
  function showDoseNotification(entry, farmaco) {
    if (!entry || !farmaco) return;
    const dateStr = entry.dateStr;
    const entryKey = `dose-${farmaco.id}-${entry.dose_numero}-${dateStr}`;
    let fireAt;
    if (entry.ora_ricalcolata) {
      fireAt = new Date(entry.ora_ricalcolata).getTime();
    } else if (entry.ora_prevista && dateStr) {
      fireAt = new Date(`${dateStr}T${entry.ora_prevista}`).getTime();
    } else {
      return; // Defensive: no schedulable timestamp.
    }
    const title = farmaco.nome;
    const body = formatRelazionePastoCopy(farmaco) || 'Promemoria farmaco';
    scheduleNotification({ entryKey, fireAt, title, body });
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
 * Filters: stato ∈ {'prevista','ricalcolata'} (skips presa/saltata/sospesa).
 * Skips entries without a corresponding farmaco in state.farmaci.
 * Skips entries with fireAt <= now (handled by scheduleNotification no-op).
 *
 * @param {object} state — must expose pianoOggi: Array<entry> and farmaci: dict.
 * @param {object} services — notifications service (DI for testability).
 */
export function rescheduleAllNotifications(state, services) {
  if (!state || !services) return;
  services.cancelAll();
  const entries = state.pianoOggi || [];
  const farmaci = state.farmaci || {};
  for (const entry of entries) {
    if (entry.stato !== 'prevista' && entry.stato !== 'ricalcolata') continue;
    const farmaco = farmaci[entry.farmaco_id];
    if (!farmaco) continue;
    services.showDoseNotification(entry, farmaco);
  }
}
