import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { selectValutazioneCanale } from '../../state/selectors.js';
import { testoRigaCanale } from '../../utils/testi.js';
import { IconAlertCircle } from './Icons.jsx';

// ============================================================
// RigaCanale -- the line of Oggi for the reminder channel ad app chiusa
// (client of branch A, step 4; STATO_CORRENTE.md, "Il commit B del client").
// ------------------------------------------------------------
// ONE LINE, ONLY WHEN THE STATE IS NOT OK. "non attivi" when the reminders
// will not arrive, "non verificati" when it is not known, "non aggiornati"
// when the server keeps the calendar it had (testi.js). The reason sits in
// Impostazioni. An OK state shows nothing: the toggle already says it is on.
//
// NEVER AN OLD OK. The state is evaluated at every render, and the context
// renders at every tick: the age of the heartbeat grows while the app stays
// open, and the line appears when it passes the threshold (decision 33 B).
// The state is never read again at intervals (Q-SYNC): the tap reads it.
//
// THE TAP RENEWS INSIDE THE GESTURE (ratification A of 2026-10-01). When
// this phone is not subscribed, subscribe() is the first act of the tap,
// the path S1 measured; otherwise the tap renews and reads the state again.
// Shared because Impostazioni does the same with "Verifica ora".
// ============================================================

/** The phone's two clocks, now. */
export function adessoDelTelefono() {
  return {
    mono: typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Number.NaN,
    ms: Date.now(),
  };
}

/**
 * The tap of the line, and of "Verifica ora". Nothing is awaited before the
 * call to iscriviNelGesto.
 * @returns {Promise<void>}
 */
export function verificaCanale({ services, actions, valutazione }) {
  const gesto = valutazione?.perche === 'non_iscritto' && typeof services?.canale?.iscriviNelGesto === 'function'
    ? services.canale.iscriviNelGesto()
    : null;
  return (async () => {
    if (gesto !== null) {
      await actions.accendiCanale?.(await gesto);
    } else {
      await actions.rinnovaCanale?.();
    }
    await actions.leggiStatoCanale?.();
  })();
}

export default function RigaCanale() {
  const { state, actions, services } = useAppContext();
  const { tokens: t } = useTheme();
  const valutazione = selectValutazioneCanale(state, adessoDelTelefono());
  const testo = testoRigaCanale(valutazione);
  if (testo === null) return null;

  return (
    <button
      type="button"
      data-testid="riga-canale"
      onClick={() => {
        void verificaCanale({ services, actions, valutazione });
      }}
      className="mt-1.5 flex items-center gap-1.5 text-left text-sm font-medium"
      style={{ color: t.textPrimary }}
    >
      <IconAlertCircle color={t.amberTx} size={16} />
      <span>{testo}</span>
    </button>
  );
}
