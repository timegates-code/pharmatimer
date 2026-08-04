import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { STATI_CODA, testoIndicatoreCoda } from '../../utils/testi.js';
import { IconCheck, IconArrowUp, IconAlertCircle } from './Icons.jsx';

// ============================================================
// IndicatoreCoda -- CS-5.5-quater, esteso a CS-5.6-bis PARTE 2.
// Spec 14.5 p.1 e p.2 (s.6.274 ESTINTA: il quarto stato e coperto come
// dimensione ORTOGONALE, e STATI_CODA resta a tre).
// SENTINEL_QROSONE_INDICATORE
// ------------------------------------------------------------
// SINGLE SEAT OF THE PRECEDENCE (Q-LUCERNA-9=A). `testi.js` :201-203
// states that `testoIndicatoreCoda` is TOLD which state to dress and does
// not choose one: `parked` > `pending` > quiet lives HERE and nowhere
// else. The opposite order would bury the one state that asks for human
// hands underneath a state declared "nothing is up to you", which is M2.
//
// IT READS THE CONTEXT ITSELF (Q-ROSONE-9=A). Three mounting seats each
// passing the count as a prop would be three readers and three chances to
// diverge -- lesson 6.205 carried onto a clinical surface. The reading
// sits where the decision sits.
//
// `coda == null` IS NOT THE QUIET STATE. It is "not yet known", the
// initial value of `initialState.coda`. Painting "Tutto inviato" before
// the first collection would assert something the app does not know,
// which is M3 on the surface. Loose equality is deliberate: `null` and
// `undefined` are the same ignorance.
//
// TOUCH AREA DELIBERATELY OFF until CS-5.6 (Q-LUCERNA-5=A): no onClick,
// no role, no tabIndex. A generous area that does nothing teaches an
// elderly person that touching this app is pointless.
//
// NO `aria-live`, and the reason is measured in Spec :1133 -- noise
// trains people to ignore messages -- while `N` moves on every drain
// pass. The text is readable, it is simply not announced on its own.
//
// ALWAYS ICON PLUS TEXT, NEVER COLOUR ALONE (14.5 p.1): the three states
// carry three DISTINCT glyphs, so colour rides on top of a shape and is
// never the only carrier. Only `Da controllare` takes the attention
// colour, which is what 14.5 p.1 prescribes for it and for it alone.
//
// The second line renders exactly when `rassicurazione` is non-null. That
// is not a rule invented here: `testoIndicatoreCoda` returns `null` for
// it in the quiet state (`testi.js` :212-216), because 14.5 p.1 asks the
// quiet state to be a DISCREET sign.
//
// NO OUTER MARGIN. The three headers have different rhythms; spacing
// belongs to each mounting seat, not to the shared component.
// ============================================================

const GLIFI = {
  [STATI_CODA.QUIETE]: IconCheck,
  [STATI_CODA.DA_INVIARE]: IconArrowUp,
  [STATI_CODA.DA_CONTROLLARE]: IconAlertCircle,
};

/**
 * Pure decision core, on the house pattern of `shouldOpenOnboarding` and
 * `loginGateAction` (App.jsx): the precedence is testable without a DOM.
 *
 * Non-integer or absent counts degrade to zero rather than throwing: this
 * component sits in three headers and must never be the reason a view
 * fails to paint, because a view that does not paint is a person who
 * cannot register (M2).
 *
 * @param {{pending?: number, parked?: number}|null|undefined} coda
 * @returns {{stato: string, n: number}|null} `null` means "not yet known".
 */
export function scegliStatoCoda(coda) {
  if (coda == null) return null;
  const parked = Number.isInteger(coda.parked) ? coda.parked : 0;
  const pending = Number.isInteger(coda.pending) ? coda.pending : 0;
  if (parked > 0) return { stato: STATI_CODA.DA_CONTROLLARE, n: parked };
  if (pending > 0) return { stato: STATI_CODA.DA_INVIARE, n: pending };
  return { stato: STATI_CODA.QUIETE, n: 0 };
}

export default function IndicatoreCoda() {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();

  const scelta = scegliStatoCoda(state?.coda);
  if (scelta === null) return null;

  // Fail-closed on the totality doctrine of `testi.js` :195-199: a phrase
  // with a hole in it is worse than no phrase at all.
  // SENTINEL_QLESENA_INNESTO
  // Q-ZAGARA-1=A keeps `scegliStatoCoda` at THREE states, so the flag does
  // not pass through it: it is merged HERE, and `testoIndicatoreCoda` reads
  // it with strict `=== true`. Absent slice arrives `undefined` and appends
  // nothing, which is why the eighteen pins above stay green untouched.
  const testo = testoIndicatoreCoda({
    ...scelta,
    senzaCollegamento: state?.senzaCollegamento,
  });
  if (testo === null) return null;

  const Glifo = GLIFI[scelta.stato];
  const quiete = scelta.stato === STATI_CODA.QUIETE;
  const attenzione = scelta.stato === STATI_CODA.DA_CONTROLLARE;

  return (
    <div data-testid="indicatore-coda">
      <div className="flex items-center gap-1.5">
        <Glifo color={attenzione ? t.amberTx : t.textSecondary} size={16} />
        <span
          className={quiete ? 'text-xs' : 'text-sm font-medium'}
          style={{ color: quiete ? t.textSecondary : t.textPrimary }}
          data-testid="indicatore-coda-etichetta"
        >
          {testo.etichetta}
        </span>
      </div>
      {testo.rassicurazione !== null && (
        <p
          className="text-xs mt-0.5"
          style={{ color: t.textSecondary }}
          data-testid="indicatore-coda-rassicurazione"
        >
          {testo.rassicurazione}
        </p>
      )}
    </div>
  );
}
