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

/** Line 2 of the degraded card -- states the absence without jargon. */
export const AVVISO_CONFLITTO_FATTI_ASSENTI =
  'I dettagli di questa registrazione non sono disponibili.';

/** Line 4 of the degraded card -- same "nothing is up to you" clause. */
export const AVVISO_CONFLITTO_CHIUSURA_ASSENTI =
  'Non devi fare niente adesso. Se vuoi, controlla le tue dosi nella schermata Oggi.';

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

/**
 * The SAME card with the facts left out, for a record whose facts cannot be
 * read back (Q-TRAMA-4=A).
 *
 * Four lines and one button, exactly like the complete card: Q-LETTO-8=A is
 * neither touched nor amended. This function takes no arguments and NEVER
 * returns null -- that is the point. Its caller has already dropped the
 * gesture, so showing nothing would be a silent discard, which is M2.
 *
 * The facts line says the details are unavailable and NOT that the dose was
 * missed: the dose WAS taken, and what did not go through is the
 * registration.
 *
 * SENTINEL_QTRAMA_DEGRADATO
 *
 * @returns {{titolo: string, fatti: string, spiegazione: string,
 *            chiusura: string, azione: string}}
 */
export function testoAvvisoDegradato() {
  return Object.freeze({
    titolo: AVVISO_CONFLITTO_TITOLO,
    fatti: AVVISO_CONFLITTO_FATTI_ASSENTI,
    spiegazione: AVVISO_CONFLITTO_SPIEGAZIONE,
    chiusura: AVVISO_CONFLITTO_CHIUSURA_ASSENTI,
    azione: AVVISO_CONFLITTO_AZIONE,
  });
}

/* ============================================================
 * Indicatore di coda -- Spec 14.5.1, TRE stati (s.6.274).
 * SENTINEL_QOBLO_INDICATORE_TESTI
 * ------------------------------------------------------------
 * THE REFERENT OF THE COUNT LIVES IN THE PHRASE (Q-OBLO-1=A). `N` counts
 * OUTBOX ELEMENTS: LocalRepository.outboxCounts :684 counts elements by
 * `stato`, and Spec 14.6 p.1 puts ONE plate per element, so an element is
 * ONE gesture and a single gesture may move TWO ledger rows -- the presa of
 * D plus the recalculation of D+1. It is therefore neither a count of doses
 * nor a count of rows, and a reader sitting in front of OggiView.jsx
 * :499-530, where six badges count DOSES inside the very same sticky
 * header, would read it as doses unless the phrase says otherwise. The noun
 * is not new: it is the one already load-bearing in the M3 clause at :22-25
 * of this file.
 *
 * THE THIRD STATE IS ABSENT ON PURPOSE. `Senza collegamento` is deferred to
 * CS-5.6 together with its source AND its precedence (s.6.274): the only
 * honest source is proof by delivery, and s.6.271 declared
 * `navigator.onLine` unsalvageable on iOS in standalone.
 *
 * NO IMPERATIVE IN ANY PHRASE, and the reason is measured: Q-LUCERNA-5=A
 * keeps the touch area OFF until CS-5.6, so today `Da controllare` has no
 * door behind it. Asking for a gesture that leads nowhere teaches the person
 * that the messages of this app are noise, which is the illness 14.5 p.4
 * names. The label itself is prescribed verbatim by 14.5 p.1 and is a NOUN,
 * never a command.
 *
 * PLURAL AGREEMENT is phrase composition and NOT value formatting: the
 * module still receives the count already resolved and never formats a date
 * or a time. `1 registrazione` instead of `1 registrazioni` costs nothing,
 * and a wrong plural reads as carelessness to the person it addresses.
 * ============================================================ */

/**
 * The three states of the indicator. The surface imports these instead of
 * typing literals, so a rename cannot drift between copy and component.
 */
export const STATI_CODA = Object.freeze({
  QUIETE: 'quiete',
  DA_INVIARE: 'da_inviare',
  DA_CONTROLLARE: 'da_controllare',
});

/** Quiet state -- 14.5 p.1 asks for a DISCREET sign, so there is no line 2. */
export const INDICATORE_QUIETE_ETICHETTA = 'Tutto inviato';

/**
 * 14.5 p.7 plus the clinical cost of s.6.274: it states what happens by
 * itself and what is up to the person, and asserts NOTHING about a
 * connection the app cannot measure.
 */
export const INDICATORE_DA_INVIARE_RASSICURAZIONE =
  'Sono al sicuro sul telefono e si inviano da sole. Non devi fare niente.';

/**
 * The one state that would ask for hands, saying so WITHOUT asking, because
 * the door opens only at CS-5.6. Second sentence taken verbatim from
 * AVVISO_CONFLITTO_CHIUSURA: a formula already ratified, not a new one.
 */
export const INDICATORE_DA_CONTROLLARE_RASSICURAZIONE =
  'Sono al sicuro sul telefono, ma non partono da sole. Non devi fare niente adesso.';

/**
 * @param {number} n
 * @returns {string} `1 registrazione` for one, `N registrazioni` otherwise.
 */
function registrazioni(n) {
  return n === 1 ? '1 registrazione' : `${n} registrazioni`;
}

/**
 * Compose the indicator phrase for ONE state.
 *
 * TOTALITY IS DELIBERATE, on the precedent of `testoAvvisoConflitto`: an
 * unknown state, or a count that is not a positive integer where a count is
 * required, returns `null` instead of a sentence with a hole in it. A
 * numbered state at zero is a contradiction and not an edge case: with the
 * queue empty the state IS the quiet one.
 *
 * The PRECEDENCE between states is NOT decided here -- Q-LUCERNA-5=A puts it
 * in the component, in a single seat. This function is told which state to
 * dress, and dresses it.
 *
 * @param {object} [arg]
 * @param {string} [arg.stato]  one of the values of `STATI_CODA`
 * @param {number} [arg.n]      element count; ignored by `QUIETE`
 * @returns {{etichetta: string, rassicurazione: string|null}|null}
 */
export function testoIndicatoreCoda(arg = {}) {
  const { stato, n } = arg || {};
  if (stato === STATI_CODA.QUIETE) {
    return Object.freeze({
      etichetta: INDICATORE_QUIETE_ETICHETTA,
      rassicurazione: null,
    });
  }
  if (!Number.isInteger(n) || n < 1) return null;
  if (stato === STATI_CODA.DA_INVIARE) {
    return Object.freeze({
      etichetta: `Da inviare: ${registrazioni(n)}`,
      rassicurazione: INDICATORE_DA_INVIARE_RASSICURAZIONE,
    });
  }
  if (stato === STATI_CODA.DA_CONTROLLARE) {
    return Object.freeze({
      etichetta: `Da controllare: ${registrazioni(n)}`,
      rassicurazione: INDICATORE_DA_CONTROLLARE_RASSICURAZIONE,
    });
  }
  return null;
}
