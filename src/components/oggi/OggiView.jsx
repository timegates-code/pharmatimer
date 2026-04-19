// ============================================================
// OggiView — vista principale read-only (Sessione 7b-1).
//
// Mette insieme tutti i pezzi prodotti dai checkpoint precedenti:
//   - header con nome app, data/profilo attivo, orologio digitale, toggle tema
//   - counters del giorno via `selectCountersForDay` (AMB-7b.F, bugfix §6.9)
//   - `DevTimeSlider` guardato da `import.meta.env.DEV` QUI (AMB-7b.J)
//   - rendering multi-giorno via `groupEntriesByDayAndMomento` (§6.29, AMB-7b.G)
//   - `DoseCard` read-only per ciascuna entry, con flash auto-beep via
//     `useAutoBeep` (AMB-7b.I) e `playBeep` reale (AMB-7b.H)
//   - toggle tema con ciclo auto→dark→light→auto via `actions.setSetting`
//     (AMB-7b.K)
//
// Scope 7b-1: **SOLA LETTURA**. Nessun dispatch di `presa`, `annullaUltima`,
// apertura modali. La Card NON ha il pulsante PRESA in questa sessione.
//
// Le keyframes `@keyframes scaduta-pulse` e `@keyframes flash-alert` sono
// iniettate inline con un <style> tag: sono consumate da DoseCard via
// classNames e vivono naturalmente dove DoseCard viene renderizzata.
// Quando in Step 9 le notifiche/service worker arriveranno, saranno
// promosse in index.css.
// ============================================================

import { useMemo } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { useNow } from '../../hooks/useNow.js';
import { useAutoBeep } from '../../hooks/useAutoBeep.js';
import { selectCountersForDay } from '../../state/selectors.js';
import {
  groupEntriesByDayAndMomento,
  getCardState,
  formatDateLabel,
  formatDuration,
} from '../../utils/uiState.js';
import { minutesToTime } from '../../utils/time.js';
import { playBeep } from '../../services/audio.js';
import { DoseCard } from './DoseCard.jsx';
import { DevTimeSlider } from './DevTimeSlider.jsx';
import { Badge } from '../shared/Badge.jsx';

const IS_DEV = import.meta.env.DEV;

// Inline CSS: keyframes consumed by DoseCard via className + slider thumb.
const CARD_AND_SLIDER_CSS = `
  @keyframes scaduta-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
    50%      { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3); }
  }
  .animate-scaduta { animation: scaduta-pulse 2s ease-in-out infinite; }
  @keyframes flash-alert {
    0%   { filter: brightness(1); }
    15%  { filter: brightness(1.6); }
    30%  { filter: brightness(1); }
    45%  { filter: brightness(1.6); }
    60%  { filter: brightness(1); }
    75%  { filter: brightness(1.4); }
    100% { filter: brightness(1); }
  }
  .animate-flash { animation: flash-alert 1.5s ease-out; }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
    background: #2563EB; cursor: pointer; border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`;

// ---------- SVG icon paths (1:1 mockup v5 theme toggle) ----------
const MOON_PATH = 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
const SUN_PATHS = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';

// ---------- main view ----------

export default function OggiView() {
  const { state, actions } = useAppContext();
  const { dark, tokens: t, mode } = useTheme();
  const now = useNow();

  // --- memoised derivations (hooks-before-returns rule) ---

  const today = now.dateStr;

  const todayEntries = useMemo(
    () => state.plan.filter((e) => e.dateStr === today),
    [state.plan, today]
  );

  // Auto-beep on dose crossings. Returns the Set of flashing entry keys
  // read by DoseCard via the `isFlashing` prop.
  const flashingKeys = useAutoBeep(todayEntries, now, playBeep);

  const groupedDays = useMemo(
    () => groupEntriesByDayAndMomento(state.plan),
    [state.plan]
  );

  const counters = useMemo(
    () => selectCountersForDay(state, today, now.date),
    [state, today, now.date]
  );

  // --- loading / error branches ---

  if (state.status === 'idle') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8 text-center"
        style={{ color: t.textSecondary }}
      >
        Caricamento…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <p className="mb-4" style={{ color: t.modalAlertTx }}>
            Errore: {state.error?.message || 'inizializzazione fallita'}
          </p>
          <button
            onClick={() => actions.init()}
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              background: t.blueBg,
              color: t.blueTx,
              border: `1px solid ${t.blueBd}`,
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // --- ready: full layout ---

  // Theme toggle cycle: auto → dark → light → auto (AMB-7b.K).
  const nextMode = mode === 'auto' ? 'dark' : mode === 'dark' ? 'light' : 'auto';
  const onToggleTheme = () => actions.setSetting('tema', nextMode);

  const profileName = state.profiloAttivo?.nome_profilo ?? '';
  const dateLabel = now.date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const subtitle = profileName ? `${dateLabel} · ${profileName}` : dateLabel;

  return (
    <>
      <style>{CARD_AND_SLIDER_CSS}</style>
      <div className="min-h-screen pb-24" style={{ maxWidth: 430, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          className="sticky top-0 z-30 px-4 pt-4 pb-3 transition-colors duration-200"
          style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="min-w-0">
              <h1
                className="text-lg font-bold truncate"
                style={{ color: t.textPrimary, letterSpacing: '-0.02em' }}
              >
                PharmaTimer
              </h1>
              <p className="text-xs truncate" style={{ color: t.textSecondary }}>
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onToggleTheme}
                aria-label={`Cambia tema (attuale: ${mode})`}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: t.grayBg }}
              >
                {mode === 'auto' ? (
                  // Half-filled circle = standard OS/system "auto theme" glyph
                  // (macOS / iOS settings pattern). Distinct from both moon and
                  // sun so the three cycle states remain visually unambiguous.
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={t.textSecondary} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3 A9 9 0 0 1 12 21 Z"
                      fill={t.textSecondary} stroke="none" />
                  </svg>
                ) : mode === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={t.textSecondary} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d={MOON_PATH} />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={t.textSecondary} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <path d={SUN_PATHS} />
                  </svg>
                )}
              </button>
              <span
                className="text-2xl font-bold"
                style={{ color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {now.hhmm}
              </span>
            </div>
          </div>

          {/* COUNTERS */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <Badge
              label={`${counters.presi} presi`}
              bg={t.greenBg} text={t.greenTx} border={t.greenBg}
            />
            {counters.saltate > 0 && (
              <Badge
                label={`${counters.saltate} saltati`}
                bg={t.redBg} text={t.redTx} border={t.redBg}
              />
            )}
            {counters.sospese > 0 && (
              <Badge
                label={`${counters.sospese} sospesi`}
                bg={t.sospesaBg} text={t.sospesaTx} border={t.sospesaBg}
              />
            )}
            {counters.inRitardo > 0 && (
              <Badge
                label={`⏰ ${counters.inRitardo} in ritardo`}
                bg={t.inRitardoBg} text={t.inRitardoTx} border={t.inRitardoBd}
              />
            )}
            {counters.prossimoIn !== null && counters.prossimoIn >= 0 && (
              <Badge
                label={`tra ${formatDuration(counters.prossimoIn)}`}
                bg={t.amberBg} text={t.amberTx} border={t.amberBg}
              />
            )}
            <Badge
              label={`${counters.restanti} restanti`}
              bg={t.grayBg} text={t.grayTx} border={t.grayBg}
            />
          </div>

          {/* DEV SLIDER — guarded here, not inside the component (AMB-7b.J) */}
          {IS_DEV && (
            <DevTimeSlider
              minutes={now.minutes}
              onMinutesChange={(v) => actions.setSimulatedNow(minutesToTime(v))}
            />
          )}
        </div>

        {/* MULTI-DAY CARDS */}
        <div className="px-4 mt-1">
          {groupedDays.length === 0 ? (
            <p className="text-center text-sm mt-8" style={{ color: t.textSecondary }}>
              Nessuna dose programmata.
            </p>
          ) : (
            groupedDays.map((day) => (
              <div key={day.dateStr}>
                {/* DATE SEPARATOR */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: t.dateSepBg }} />
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2"
                    style={{ color: t.dateSepTx }}
                  >
                    {formatDateLabel(day.dateStr, today)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: t.dateSepBg }} />
                </div>

                {/* MOMENTO GROUPS */}
                {day.groups.map((group, gIdx) => (
                  <div key={`${day.dateStr}-g${gIdx}`} className="mb-3">
                    <div
                      className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-1"
                      style={{ color: t.textSecondary }}
                    >
                      ORE {group.primaOra}
                      {group.descrizioneMomento
                        ? ` — ${group.descrizioneMomento.toUpperCase()}`
                        : ''}
                    </div>
                    {group.entries.map((entry, eIdx) => {
                      // Gap +12px on time change within the same momento (§6.29).
                      const thisTime = entry.ora_ricalcolata || entry.ora_prevista;
                      const prevEntry = eIdx > 0 ? group.entries[eIdx - 1] : null;
                      const prevTime = prevEntry
                        ? prevEntry.ora_ricalcolata || prevEntry.ora_prevista
                        : null;
                      const needsGap = prevTime !== null && thisTime !== prevTime;
                      const marginTop = eIdx === 0 ? 0 : needsGap ? 12 : 4;
                      return (
                        <div key={entry.key} style={{ marginTop }}>
                          <DoseCard
                            entry={entry}
                            state={getCardState(entry, now)}
                            isFlashing={flashingKeys.has(entry.key)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
