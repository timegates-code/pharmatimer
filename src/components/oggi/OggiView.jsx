// ============================================================
// OggiView — vista principale (Sessione 7b-1 + 7b-2 + 7c-1 + 7c-2 + 7d-1).
//
// 7b-1 foundation: header + counters + multi-day grouping + DoseCard
// read-only + DEV slider + auto-beep.
//
// 7b-2 wiring (AMB-7b-2.D):
//   - `selectUltimaPresa` consumed for the per-Card `isLastPreso` prop
//   - `actions.presa(entry.key)` wired via DoseCard's onPresa prop
//   - `actions.annullaUltima()` wired via DoseCard's onUndo prop
//   - `@keyframes pulse-border` injected alongside `scaduta-pulse` and
//     `flash-alert` (same rationale: keyframes live with their consumer
//     until they graduate to index.css when Step 9 lands notifications).
//
// 7c-1 wiring (AMB-7c-1.K):
//   - 4 local useState slots for modal open-state, 4 handlers forwarded
//     to DoseCard, 4 modals mounted after the main layout.
//
// 7c-2 wiring (AMB-7c-2 A-J):
//   - `recuperoModal` shape changed to `{entry, source, triggerEl} | null`.
//     Auto-prompt hook populates it with source='auto' from state.prompt.
//   - `closeRecupero` implements dismissPrompt branching per AMB-7c-2.E/F.
//
// 7d-1 wiring (AMB-7d-1.C/D/E):
//   - Each of the 4 modal state slots tracks the DOM element that opened
//     the modal (`triggerEl`) so it can be passed as `triggerRef` to
//     `useModalA11y` inside each modal. DoseCard forwards
//     `e.currentTarget` as the 2nd arg of each modal-opening handler.
//   - Auto-opened RecuperoModal has no trigger element (opened by state
//     transition, not by a tap). For it we pass `fallbackEntryKey`, and the
//     hook's restore chain queries `[data-entry-key="<key>"]` first (see
//     DoseCard root div `data-entry-key={entry.key}`) before falling back
//     to `document.body`.
//
// 7d-1 CP4 (AMB-7d-1.H / §6.34+§6.44):
//   - DATE SEPARATOR turned into a sticky pill. `position: sticky` with
//     `top-16` (initial estimate, calibrated visually in CP browser — the
//     actual header height depends on DEV slider presence and counter row
//     wrap). `z-20` sits below the header (`z-30`) and above the cards.
//   - Uses the new `dateSepBgStrong` token for higher contrast against
//     pageBg while scrolling.
//   - Prefixed by `IconCalendar` glyph (replaces the inline ─ line dashes
//     of the 7b-1 layout — line decorations read poorly when pinned).
//   - Tiny drop shadow `0 1px 2px rgba(0,0,0,0.1)` visually separates the
//     pinned pill from the content scrolling underneath.
//
// Scope 7d polish remaining (explicitly NOT wired here):
//   - §6.39 renderHelpers wrapper refactor (CP5 this session)
//   - §6.45/§6.46/§6.47/§6.49/§6.40/§6.41 → 7d-2
//   - §6.26 cross-midnight warning elevation → Step 9
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { useNow } from '../../hooks/useNow.js';
import { useAutoBeep } from '../../hooks/useAutoBeep.js';
import {
  selectCountersForDay,
  selectUltimaPresa,
  selectPromptEntry,
} from '../../state/selectors.js';
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
import { IconCalendar } from '../shared/Icons.jsx';
import { AltroModal } from './modals/AltroModal.jsx';
import { SaltataModal } from './modals/SaltataModal.jsx';
import { SospesaModal } from './modals/SospesaModal.jsx';
import { RecuperoModal } from './modals/RecuperoModal.jsx';

const IS_DEV = import.meta.env.DEV;

// Inline CSS: keyframes consumed by DoseCard via className + inline style +
// slider thumb styling. `pulse-border` is used by the DoseCard check button
// when `isLastPreso=true` (7b-2). All three animations are simple opacity/
// filter/shadow effects — no GPU layers, safe for the sticky header.
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
  @keyframes pulse-border {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
    background: #2563EB; cursor: pointer; border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  /* 7d-1 (AMB-7d-1.J clarification, extended in CP browser): visible focus
     ring for ANY focusable element in the app. Tailwind's base reset
     removes outline on buttons; without this rule the focus-trap from
     useModalA11y is active but invisible, which defeats the a11y goal.
     Initially scoped to [role=dialog]; CP browser 4 showed the ring is
     equally needed on tappable badges outside dialogs (e.g. gap
     TapBadge) — so the rule is now global. offset 3px + 2.5px width
     provides clear separation even from dashed/rounded badge borders. */
  :focus-visible {
    outline: 2.5px solid #3B82F6;
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

// ---------- SVG icon paths (1:1 mockup v5 theme toggle) ----------
const MOON_PATH = 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
const SUN_PATHS = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42';

// 7d-1: CLOSED shape extended with triggerEl slot (AMB-7d-1.D).
const CLOSED = { open: false, entry: null, triggerEl: null };

// ---------- main view ----------

export default function OggiView() {
  const { state, actions } = useAppContext();
  const { dark, tokens: t, mode } = useTheme();
  const now = useNow();

  // --- 7c-1 modal open-state (+ 7d-1 triggerEl for a11y focus restore) ---
  const [altroModal, setAltroModal] = useState(CLOSED);
  const [saltataModal, setSaltataModal] = useState(CLOSED);
  const [sospesaModal, setSospesaModal] = useState(CLOSED);

  // --- 7c-2 RecuperoModal shape: {entry, source, triggerEl?} | null.
  //     source='manual' (tap on gap badge, triggerEl present) vs
  //     source='auto' (from state.prompt, no triggerEl).
  //     Null means closed; a single instance serves both triggers.
  const [recuperoModal, setRecuperoModal] = useState(null);

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

  // 7b-2 (AMB-7b-2.D): compute the key of the most recent PRESA action.
  // Only the Card matching this key renders an interactive UNDO affordance;
  // every other 'presa' Card shows a solid, non-clickable check glyph.
  const ultimaPresa = useMemo(
    () => selectUltimaPresa(state),
    [state.presoStack]
  );

  // 7c-2 (AMB-7c-2.C): auto-prompt hook. When the domain raises a
  // gap_recovery prompt via state.prompt and no other modal is currently
  // open, hydrate RecuperoModal with source='auto'. Any open modal
  // suspends this effect; closing that modal (transitioning back to
  // all-closed) re-runs the effect via dep tracking and opens the
  // auto-prompt if state.prompt is still set.
  //
  // Null-entry gate (documented contract of selectPromptEntry):
  //   if the prompt's entryKey no longer resolves to a plan entry
  //   (stale pointer after plan refresh, defensive malformed payload),
  //   this effect is a no-op. state.prompt remains set — the user's
  //   fallback is the manual tap on the gap badge (or the next commit
  //   overwriting the prompt per §6.48 ephemeral behaviour).
  useEffect(() => {
    if (
      altroModal.open ||
      saltataModal.open ||
      sospesaModal.open ||
      recuperoModal ||
      state.prompt?.kind !== 'gap_recovery'
    ) return;
    const entry = selectPromptEntry(state);
    if (!entry) return;
    // Auto-open has no trigger element (opened by state transition, not tap).
    setRecuperoModal({ entry, source: 'auto', triggerEl: null });
  }, [
    state.prompt,
    state.plan,
    altroModal.open,
    saltataModal.open,
    sospesaModal.open,
    recuperoModal,
  ]);

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

  // --- 7c-1 modal handlers (fire-and-forget: thunks update state) ---
  const closeAltro    = () => setAltroModal(CLOSED);
  const closeSaltata  = () => setSaltataModal(CLOSED);
  const closeSospesa  = () => setSospesaModal(CLOSED);

  // 7c-2 (AMB-7c-2.E + F): close RecuperoModal.
  //   source='auto'                      → dismissPrompt (always)
  //   source='manual', same target entry → dismissPrompt (prompt satisfied, F)
  //   source='manual', other entry       → no dismiss (prompt left pending)
  // dispatch is idempotent: dismissPrompt on already-null prompt is a no-op.
  // apply/reset paths are handled by the commit chain (§6.48) — this branch
  // only runs on overlay/close-button dismissal.
  const closeRecupero = () => {
    if (recuperoModal) {
      const { source, entry } = recuperoModal;
      if (source === 'auto') {
        actions.dismissPrompt();
      } else if (entry?.key === state.prompt?.entryKey) {
        actions.dismissPrompt();
      }
    }
    setRecuperoModal(null);
  };

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
                {/* DATE SEPARATOR — 7d-1 sticky pill (AMB-7d-1.H / §6.34+§6.44).
                    Replaces the 7b-1 "line · label · line" layout: line dashes
                    don't read well pinned; a full-width pill with icon +
                    label + strong bg reads instantly while scrolling.
                    `top-[180px]` calibrated in CP browser against the actual
                    header height (179px with DEV slider + counter row +
                    title). In production without DEV slider the header is
                    shorter; a small gap is acceptable — the alternative
                    (dynamic measurement via ref + ResizeObserver) is out of
                    7d-1 scope. */}
                <div
                  className="sticky top-[180px] z-20 my-4 py-1.5 px-3 rounded-md flex items-center justify-center gap-2"
                  style={{
                    background: t.dateSepBgStrong,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  <IconCalendar color={t.dateSepTx} size={12} />
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: t.dateSepTx }}
                  >
                    {formatDateLabel(day.dateStr, today)}
                  </span>
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
                            onPresa={() => actions.presa(entry.key)}
                            onUndo={() => actions.annullaUltima()}
                            isLastPreso={entry.key === ultimaPresa}
                            // 7d-1: modal-opening handlers now capture the
                            // trigger element (e.currentTarget) so
                            // useModalA11y can restore focus to it on close.
                            onAltro={(en, el) => setAltroModal({ open: true, entry: en, triggerEl: el })}
                            onSaltataTap={(en, el) => setSaltataModal({ open: true, entry: en, triggerEl: el })}
                            onSospesaTap={(en, el) => setSospesaModal({ open: true, entry: en, triggerEl: el })}
                            onGapTap={(en, el) => setRecuperoModal({ entry: en, source: 'manual', triggerEl: el })}
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

      {/* 7c-1 MODALS (mounted after the main layout, outside the scrolling area) */}
      {/* 7d-1: each modal receives `triggerRef` as a synthetic { current: el }
           object so useModalA11y can restore focus to the opener. */}
      {altroModal.open && (
        <AltroModal
          entry={altroModal.entry}
          todayStr={today}
          triggerRef={{ current: altroModal.triggerEl }}
          onSaltata={(en) => actions.salta(en.key)}
          onSospesa={(en) => actions.sospendi(en.key)}
          onSetTime={(en, hhmm) =>
            actions.presa(en.key, { dataEffettiva: en.dateStr, oraEffettiva: hhmm })
          }
          onClose={closeAltro}
        />
      )}
      {saltataModal.open && (
        <SaltataModal
          entry={saltataModal.entry}
          todayStr={today}
          triggerRef={{ current: saltataModal.triggerEl }}
          onCambiaInSospesa={(en) => actions.ripristina(en.key, 'sospesa')}
          onSetTime={(en, hhmm) =>
            actions.presa(en.key, { dataEffettiva: en.dateStr, oraEffettiva: hhmm })
          }
          onClose={closeSaltata}
        />
      )}
      {sospesaModal.open && (
        <SospesaModal
          entry={sospesaModal.entry}
          triggerRef={{ current: sospesaModal.triggerEl }}
          onRipristina={(en) => actions.ripristina(en.key, 'attiva')}
          onClose={closeSospesa}
        />
      )}
      {recuperoModal && (
        <RecuperoModal
          entry={recuperoModal.entry}
          // Manual opens pass triggerRef; auto opens pass null (no opener).
          // Both pass fallbackEntryKey — belt-and-suspenders:
          // - auto: primary restore path via [data-entry-key] → body
          // - manual: safety net if TapBadge doesn't forward the native event
          //   (shared component, see DoseCard.test.jsx rationale)
          triggerRef={recuperoModal.triggerEl ? { current: recuperoModal.triggerEl } : null}
          fallbackEntryKey={recuperoModal.entry?.key ?? null}
          onApply={(en, rec) => actions.recupero(en.key, rec)}
          onReset={(en) => actions.recupero(en.key, 0)}
          onClose={closeRecupero}
        />
      )}
    </>
  );
}
