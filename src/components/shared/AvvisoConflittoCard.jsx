// ============================================================
// AvvisoConflittoCard -- CS-5.3-bis parte 2, P-2. Q-LETTO-3=A, Q-TRAMA-4=A.
// ============================================================
//
// The FIRST of the two interrupting notices of Spec 14.5 p.4: an explicit
// card that STAYS UNTIL READ. It carries no action other than acknowledging
// it, and it is the M2 compensation for dropping a gesture the server
// refused -- which is why the only way out is the single button.
//
// PURE RENDERER (Q-TRAMA-3=A). It receives an already composed `scheda` and
// renders it. Junction and formatting live in `src/utils/avvisoScheda.js`;
// selection and remounting live in the Gate, which is P-3.
//
// SHAPE COPIED FROM ConfirmModal.jsx, the measured sibling in this folder:
// same overlay, same container, same `useModalA11y` wiring, buttons-only
// dismissal. Two deliberate departures, both measured:
//   - escapeDeactivates: false -- "resta finche letta" (14.5 p.4). Today
//     OnboardingModal.jsx :56 is the only other consumer that passes it.
//   - z-[70] instead of z-[60] -- ConfirmModal sits at 60 and FarmacoDrawer
//     at 50. A notice rendered UNDER another modal would be a drop with no
//     visible notice, which is M2, so this one stacks above both.
//
// `onClose` is wired to `onLetto` for hook completeness and is UNREACHABLE by
// construction: escapeDeactivates is false, clickOutsideDeactivates is false
// in the hook, and unmount teardown suppresses onDeactivate. The button is
// therefore the single path, and it fires onLetto exactly once.
//
// RESTORE FOCUS: this card opens by itself, so there is no trigger and no
// `fallbackEntryKey` is passed. The hook's chain falls through to
// document.body, which is its declared fallback and not a defect. Whether the
// dose card key is reconstructible from the record is NOT measured and is
// NOT assumed: it is matter for the suite.
//
// API props:
//   open     boolean   -- visibility gate (null-render when false).
//   scheda   object    -- { esito, testi } from componiScheda(). Required.
//   onLetto  () => void -- the person acknowledged; the caller removes it.
//
// SENTINEL_QTRAMA_CARD
// ============================================================

import { useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';

export default function AvvisoConflittoCard({ open, scheda, onLetto }) {
  const { tokens: t } = useTheme();
  const titleId = useId();
  const visibile = Boolean(open && scheda && scheda.testi);

  const { containerRef, modalProps } = useModalA11y({
    isOpen: visibile,
    onClose: onLetto,
    labelId: titleId,
    escapeDeactivates: false,
  });

  if (!visibile) return null;
  const { testi } = scheda;

  return (
    <div
      role="presentation"
      data-testid="avviso-conflitto-card"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: t.modalOverlay }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        data-esito={scheda.esito}
        className="max-w-sm w-full rounded p-6 shadow-lg"
        style={{ background: t.modalBg, color: t.textPrimary }}
      >
        <h3 id={titleId} className="text-lg font-semibold mb-2">
          {testi.titolo}
        </h3>
        <p data-testid="avviso-fatti" className="text-sm mb-2">
          {testi.fatti}
        </p>
        <p data-testid="avviso-spiegazione" className="text-sm mb-2">
          {testi.spiegazione}
        </p>
        <p data-testid="avviso-chiusura" className="text-sm mb-4">
          {testi.chiusura}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onLetto}
            className="px-4 py-2 border rounded font-semibold"
            style={{
              background: t.modalBg,
              color: t.blue,
              borderColor: t.blue,
            }}
          >
            {testi.azione}
          </button>
        </div>
      </div>
    </div>
  );
}
