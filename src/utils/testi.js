/**
 * @fileoverview CS-5.3-bis -- shared copy module for user-facing phrases.
 *
 * Seat ratified by Q-PONTE-5=A. Spec 14.5 p.6 declares deferito 66 ABSORBED
 * into CS-5 and asks that new phrases be born here AND that the existing ones
 * converge into it. This module hosts the NEW phrases only; `src/utils/copy.js`
 * keeps its two feature formatters and its three consumers untouched. That
 * departure from the second half of 14.5 p.6 is deviation s.6.272, emitted in
 * this session -- convergence is a mechanical move across three call sites and
 * belongs to a session that can pin it, not to one that also wires a guardian.
 *
 * PURE module: no imports, no state, NO formatting. It receives facts already
 * resolved to display strings and returns phrases. Date and time formatting
 * stay with the caller, so this module never grows a second formatter beside
 * the ones already living in `src/utils/` -- the defect already on the backlog
 * as "nome copy occupato".
 *
 * Clinical constraints, all measured in Spec 14.5:
 *  - p.7: no jargon, present tense, short sentences, and always state what
 *    happens by itself and what is up to the person -- almost always nothing.
 *  - p.1: the lexicon is "inviare"; sync / coda / retry are banned.
 *  - M3, load-bearing: the dose WAS taken. What did not go through is the
 *    REGISTRATION. No phrase here may say or imply that the dose was not
 *    taken, and `Avevi registrato alle` states the PERSON'S gesture, never
 *    its outcome.
 *
 * SENTINEL_S6272_TESTI
 */

/** Line 1 -- names what happened, asks nothing. */
export const AVVISO_CONFLITTO_TITOLO =
  'Una registrazione non è andata a buon fine';

/** Line 3 -- explains without naming server, conflict or queue (14.5 p.1). */
export const AVVISO_CONFLITTO_SPIEGAZIONE =
  'Nei dati questa dose risulta già diversa, perciò la registrazione non è stata accolta.';

/** Line 4 -- the "what is up to you: nothing" clause of 14.5 p.7. */
export const AVVISO_CONFLITTO_CHIUSURA =
  'Non devi fare niente adesso. Se vuoi, controlla la dose nella schermata Oggi.';

/** The single button. Q-PONTE-7=A: no action inside the card. */
export const AVVISO_CONFLITTO_AZIONE = 'Ho letto';

/**
 * @param {unknown} v
 * @returns {boolean} true when `v` is a non-blank string.
 */
function testoPresente(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Compose the four lines of the conflict card from frozen facts.
 *
 * TOTALITY IS DELIBERATE, and so is its absence: the function returns `null`
 * when any required fact is missing or blank, instead of rendering a sentence
 * with a hole in it. A card reading "undefined, dose undefined" would be M3
 * applied to the surface. The consumer's behaviour on `null` is NOT decided
 * here -- it is matter for the Gate, ratified in P-2.
 *
 * @param {object} [fatti]
 * @param {string} [fatti.farmacoNome]  denormalised at drop time (Q-LETTO-4=A)
 * @param {number} [fatti.doseNumero]   1-based dose index
 * @param {string} [fatti.dataLabel]    already formatted by the caller
 * @param {string} [fatti.oraLabel]     already formatted; the TAP time (M3)
 * @returns {{titolo: string, fatti: string, spiegazione: string,
 *            chiusura: string, azione: string}|null}
 */
export function testoAvvisoConflitto(fatti = {}) {
  const { farmacoNome, doseNumero, dataLabel, oraLabel } = fatti || {};
  if (!testoPresente(farmacoNome)) return null;
  if (!testoPresente(dataLabel)) return null;
  if (!testoPresente(oraLabel)) return null;
  if (!Number.isInteger(doseNumero) || doseNumero < 1) return null;

  return Object.freeze({
    titolo: AVVISO_CONFLITTO_TITOLO,
    fatti: `${farmacoNome}, dose ${doseNumero} del ${dataLabel}. Avevi registrato alle ${oraLabel}.`,
    spiegazione: AVVISO_CONFLITTO_SPIEGAZIONE,
    chiusura: AVVISO_CONFLITTO_CHIUSURA,
    azione: AVVISO_CONFLITTO_AZIONE,
  });
}
