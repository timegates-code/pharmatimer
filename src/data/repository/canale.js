// src/data/repository/canale.js
//
// PharmaTimer -- the network calls of the Web Push reminder channel, branch
// A, and this phone's device_id. Decision 14 A of STATO_CORRENTE.md: the
// module sits beside apiClient, like avvisiStore.js, outside the repository
// chain. apiClient.js and ApiRepository.js are VIETATO and stay as they are:
// this file imports apiClient and adds nothing to it.
//
// The five endpoints are those of backend/pharmatimer_api/routers/push.py.
// Two shapes come from apiClient: every 5xx reaches the caller as
// DB_UNAVAILABLE with the server's message, so the reason the channel is off
// is read from /api/push/stato; and a DELETE carries no body, so the
// subscription to turn off is named by device_id in the path.
//
// device_id is the phone's own id, generated once and kept in localStorage:
// with it the server keeps one active subscription per phone (v07). Without
// localStorage there is no id, and the channel does not subscribe.

import { apiClient } from './apiClient.js';
import { defaultNewId } from '../../domain/outboxSplitter.js';

/** Measured free against the keys in use: userToken, useApiRepo, mirrorFreshness, onboardingCompleted, avviso.* */
const DEVICE_ID_KEY = 'pharmatimer.canale.deviceId';

const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * This phone's id as stored, or null when absent, malformed or unreadable.
 * Never creates one: turning the channel off must not mint an identity.
 * @returns {string|null}
 */
export function leggiDeviceId() {
  try {
    const valore = localStorage.getItem(DEVICE_ID_KEY);
    return typeof valore === 'string' && FORMA_UUID.test(valore) ? valore : null;
  } catch {
    return null;
  }
}

/**
 * This phone's id, generated and stored the first time. A malformed value is
 * replaced. null when the id cannot be generated or does not stay written:
 * an id that changes at every opening would leave the phone's older
 * subscriptions active next to the new one.
 * @returns {string|null}
 */
export function deviceId() {
  const esistente = leggiDeviceId();
  if (esistente !== null) return esistente;
  try {
    const nuovo = defaultNewId();
    localStorage.setItem(DEVICE_ID_KEY, nuovo);
    return leggiDeviceId() === nuovo ? nuovo : null;
  } catch {
    return null;
  }
}

/** GET /api/push/chiave: the VAPID public key, base64url. Rejects without one (503). */
export async function leggiChiave() {
  const risposta = await apiClient.get('/api/push/chiave');
  return risposta?.chiave_pubblica;
}

/**
 * PUT /api/push/iscrizione: this phone's subscription, upserted and confirmed.
 * @param {{endpoint: string, keys: {p256dh: string, auth: string}, device_id: string}} iscrizione
 */
export function confermaIscrizione({ endpoint, keys, device_id }) {
  return apiClient.put('/api/push/iscrizione', {
    endpoint,
    keys: { p256dh: keys?.p256dh, auth: keys?.auth },
    device_id,
  });
}

/** DELETE /api/push/iscrizione/{device_id}: this phone's subscription off. */
export function revocaIscrizione(id) {
  if (typeof id !== 'string' || !FORMA_UUID.test(id)) {
    return Promise.reject(new Error('device_id non valido'));
  }
  return apiClient.delete(`/api/push/iscrizione/${id}`);
}

/** PUT /api/push/calendario: the resolved calendar of the plan window, replaced whole. */
export function pubblicaCalendario(calendario) {
  return apiClient.put('/api/push/calendario', calendario);
}

/** GET /api/push/stato: key, heartbeat, subscriptions, publication and outcomes. */
export function leggiStato() {
  return apiClient.get('/api/push/stato');
}
