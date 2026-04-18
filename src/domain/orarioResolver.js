/**
 * @fileoverview Resolves scheduled time (ora_prevista) for a given OrarioBase
 * by combining its reference anchor and offset with the active Profilo.
 *
 * Extracted from planBuilder.js in Session 4b to allow reuse in recalc.js
 * (profile re-application) without introducing a dependency from recalc to
 * planBuilder. See Changelog Fase 2 §6.16 for rationale.
 *
 * Pure function: no Date.now(), no globals, no DB access.
 */

import { timeToMinutes, minutesToTime } from '../utils/time.js';

/**
 * Compute the scheduled time 'HH:MM' for an orario_base entry given the active profilo.
 * Offset is in minutes from the anchor; anchor='assoluto' means offset is minutes from 00:00.
 *
 * @param {import('./types.js').OrarioBase} orario
 * @param {import('./types.js').Profilo} profilo
 * @returns {string} 'HH:MM'
 */
export function computeOraPrevista(orario, profilo) {
  const anchors = {
    sveglia: profilo.ora_sveglia,
    colazione: profilo.ora_colazione,
    pranzo: profilo.ora_pranzo,
    cena: profilo.ora_cena,
    sonno: profilo.ora_sonno,
  };
  const base =
    orario.ancora_riferimento === 'assoluto'
      ? 0
      : timeToMinutes(anchors[orario.ancora_riferimento]);
  return minutesToTime(base + orario.offset_minuti);
}
