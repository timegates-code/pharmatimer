/**
 * @fileoverview The reminder of one dose: its instant and its text, the same
 * on the two channels that carry it, the page timers
 * (services/notifications.js) and the Web Push calendar the phone publishes
 * (pubblicatore.js). Pure: no clock, no I/O.
 *
 * - istanteDose: the formula the page timers have always used,
 *   `ora_ricalcolata` when there is one, else `ora_prevista` on the entry's
 *   day, through the single DST door of utils/time.js (decision 1).
 * - testoDose: decision 32 A of STATO_CORRENTE.md (2026-10-01). Title: the
 *   name of the farmaco, which carries the dosage (decision 20). Body: the
 *   hour of the instant, the relation to meals when there is one, and the
 *   invitation to open the app. Never a state (I1, rapporto.md :41-43): the
 *   phone may already have closed the dose, offline. One text on both
 *   channels, so a double on the iPhone with the app open (decision 10 A)
 *   reads as one dose shown twice; the worker rewrites a closed dose from the
 *   same "Dose delle HH:MM" (public/sw-push.js).
 */

import { parseIsoDateTime, wallToInstant } from '../utils/time.js';
import { formatRelazionePastoCopy } from '../utils/copy.js';

// The limits of the server (backend/pharmatimer_api/models/promemoria.py,
// VoceCalendario): one field beyond them refuses the whole publication. The
// data stay inside by construction (farmaci.nome and dettaglio_pasto are 100
// at most); the cut is for what does not.
export const TITOLO_MAX = 100;
export const CORPO_MAX = 255;

const INVITO = "Apri l'app per controllare.";

/**
 * The instant of a dose, epoch ms, or null when it has no time.
 * @param {import('./types.js').PlanEntry} entry
 * @returns {number|null}
 */
export function istanteDose(entry) {
  if (!entry) return null;
  if (entry.ora_ricalcolata) return parseIsoDateTime(entry.ora_ricalcolata).dateObj.getTime();
  if (entry.ora_prevista && entry.dateStr) return wallToInstant(entry.dateStr, entry.ora_prevista).getTime();
  return null;
}

function dueCifre(n) {
  return String(n).padStart(2, '0');
}

function tronca(testo, massimo) {
  return testo.length <= massimo ? testo : `${testo.slice(0, massimo - 3)}...`;
}

function relazioneColPasto(farmaco) {
  const testo = formatRelazionePastoCopy(farmaco);
  if (typeof testo !== 'string') return null;
  const pulito = testo.replace(/\s+/g, ' ').trim().replace(/[\s.;:,!]+$/, '');
  return pulito === '' ? null : pulito;
}

/**
 * Title and body of the reminder of a dose (decision 32 A).
 * @param {import('./types.js').PlanEntry} entry
 * @param {import('./types.js').Farmaco} farmaco
 * @returns {{titolo: string, corpo: string}}
 */
export function testoDose(entry, farmaco) {
  const nome = String(farmaco?.nome ?? '').replace(/\s+/g, ' ').trim();
  const istante = istanteDose(entry);
  const quando = istante === null ? null : new Date(istante);
  let corpo = quando === null || Number.isNaN(quando.getTime())
    ? 'Dose'
    : `Dose delle ${dueCifre(quando.getHours())}:${dueCifre(quando.getMinutes())}`;
  const relazione = relazioneColPasto(farmaco);
  if (relazione !== null) corpo += `, ${relazione}`;
  corpo += `. ${INVITO}`;
  return {
    titolo: tronca(nome === '' ? 'Farmaco' : nome, TITOLO_MAX),
    corpo: tronca(corpo, CORPO_MAX),
  };
}
