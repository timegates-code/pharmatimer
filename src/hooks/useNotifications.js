import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';

// Wave B notifications hook (§6.123 / AMB-9.F').
//
// Shape: {permission, enabled, isStandalone, requestEnable, disable}.
// Decision tree 4 stati (isStandalone × permission):
//   (1) !isStandalone           → toggle nascosto + banner installa
//   (2) standalone + 'default'  → toggle off, tap requestEnable → requestPermission
//   (3) standalone + 'granted'  → toggle abilitato, gating notifiche_attive
//   (4) standalone + 'denied'   → toggle disabilitato + banner permesso negato
//
// Defensive permission revocation check su mount + visibilitychange
// (rileva revoca iOS post-subscribe → forza notifiche_attive=0).
//
// Decisioni pre-codice (Sessione 9-B CP3, "procedi al meglio"):
//   Q-CP3.1: useApp() expone state.impostazioni.notifiche_attive,
//            services.notifications, actions.setSetting (da confermare in CP4).
//   Q-CP3.2: isStandalone via matchMedia + navigator.standalone fallback,
//            useState lazy init (statico per sessione).
//   Q-CP3.3: requestEnable usa il return value di requestPermission() come
//            autoritativo (MDN), poi setPermission(result) ottimistico.
//   Q-CP3.4: disable no-op se !isStandalone o permission==='denied'
//            (toggle non visibile/disabilitato, mai chiamato in pratica).
//   Q-CP3.5: revocation check on mount E on visibilitychange visible.
//
// Client of the reminder channel ad app chiusa, step 2 (STATO_CORRENTE.md,
// "Il commit B del client"). The toggle stays the one consent: in API mode
// it also subscribes and unsubscribes this phone (services/canalePush.js).
//   - At the entry of the section (this hook's only host) the channel gets
//     ready: registration, key, the worker's answer.
//   - Ratification A of 2026-10-01, the order inside the tap: with the
//     preparation complete, subscribe() is the FIRST act of the gesture and
//     asks for the permission itself, the path S1 measured on the pilot's
//     iPhone. Without it the tap does what it did before the channel, and the
//     state says why the channel did not turn on.
//   - Toggle off, or the permission revoked: the channel goes off too.

function detectIsStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
  } catch {
    /* noop */
  }
  return Boolean(window.navigator && window.navigator.standalone);
}

function readPermission(notifications) {
  if (!notifications || !notifications.isSupported || !notifications.isSupported()) {
    return 'denied';
  }
  return notifications.getPermission();
}

export function useNotifications() {
  const { state, services, actions } = useApp();
  const notifications = services && services.notifications;
  const canale = services && services.canale;

  const [isStandalone] = useState(detectIsStandalone);
  const [permission, setPermission] = useState(() => readPermission(notifications));

  const notificheAttive =
    state && state.impostazioni && state.impostazioni.notifiche_attive === 1;
  const enabled = isStandalone && permission === 'granted' && notificheAttive;

  // Defensive revocation check su mount + visibilitychange.
  useEffect(() => {
    function checkRevocation() {
      const current = readPermission(notifications);
      setPermission(current);
      if (notificheAttive && current !== 'granted') {
        actions.setSetting('notifiche_attive', 0);
        notifications.cancelAll();
        actions.spegniCanale?.();
      }
    }
    checkRevocation();
    function onVisibilityChange() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkRevocation();
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
    // deps volutamente incomplete -- react-hooks non e installato in eslint.config.js
  }, [notificheAttive]);

  // The channel gets ready before any tap needs it. Never rejects; outside
  // API mode it does nothing.
  useEffect(() => {
    try {
      canale?.prepara?.();
    } catch {
      // the channel is a reminder: the section opens whatever it does
    }
    // deps volutamente incomplete -- react-hooks non e installato in eslint.config.js
  }, []);

  const requestEnable = useCallback(async () => {
    if (!isStandalone) throw new Error('not_standalone');
    const current = readPermission(notifications);
    if (current === 'denied') throw new Error('permission_denied');
    // Ratification A of 2026-10-01: subscribe() is the first act of the
    // gesture. Nothing is awaited before this line.
    const gesto = typeof canale?.iscriviNelGesto === 'function' ? canale.iscriviNelGesto() : null;
    if (gesto !== null) {
      const esito = await gesto;
      const dopo = readPermission(notifications);
      setPermission(dopo);
      if (dopo === 'granted') {
        const salvato = await actions.setSetting('notifiche_attive', 1);
        if (salvato?.ok === false) {
          // The toggle did not stay on: the subscription just made goes too.
          await actions.spegniCanale?.();
          return;
        }
        await actions.accendiCanale?.(esito);
        return;
      }
      if (dopo === 'denied') throw new Error('permission_denied');
      return; // prompt closed without an answer
    }
    if (current === 'granted') {
      await actions.setSetting('notifiche_attive', 1);
      await actions.accendiCanale?.(null);
      return;
    }
    // 'default' → richiede prompt OS.
    const result = await notifications.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await actions.setSetting('notifiche_attive', 1);
      await actions.accendiCanale?.(null);
      return;
    }
    if (result === 'denied') {
      throw new Error('permission_denied');
    }
    // 'default' (utente chiude prompt) → noop silenzioso.
  }, [isStandalone, notifications, actions, canale]);

  const disable = useCallback(async () => {
    if (!isStandalone) return;
    if (permission === 'denied') return;
    await actions.setSetting('notifiche_attive', 0);
    notifications.cancelAll();
    await actions.spegniCanale?.();
  }, [isStandalone, permission, notifications, actions]);

  return { permission, enabled, isStandalone, requestEnable, disable };
}
