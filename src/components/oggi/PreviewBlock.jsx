// ============================================================
// PreviewBlock — Q-UX.4 (CP3 v3.0.0 Step 1).
// ============================================================
// Renders the "PROSSIMA TERAPIA" preview block when oggi has 0
// entries but at least one farmaco is active and the plan has
// entries on a future day. Mounted by OggiView in place of the
// existing "Nessuna dose programmata." fallback.
//
// par.6.170 — Uses a local PreviewCard component instead of
// adding a `readonly` prop to DoseCard. Avoids touching a 360+
// LOC file with 4 modals + 3 affordance contracts. Preview cards
// are visually simplified (ora + nome) with opacity 0.7.
//
// Trigger logic (par.6.171): see selectProssimoGiornoConDosi.
// ============================================================

import { useTheme } from "../../hooks/useTheme.js";
import { useAppContext } from "../../state/AppContext.jsx";

function PreviewCard({ entry }) {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const farmaco = state.farmaci?.find((f) => f.id === entry.farmaco_id);

  return (
    <div
      className="rounded-lg p-3 mb-2 border"
      style={{ borderColor: t.borderSubtle ?? "#888" }}
      data-testid={`preview-card-${entry.key}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: t.textPrimary }}
        >
          {entry.ora_prevista}
        </span>
        <span className="text-sm" style={{ color: t.textPrimary }}>
          {farmaco?.nome ?? "—"}
        </span>
      </div>
    </div>
  );
}

export default function PreviewBlock({ proxData }) {
  const { tokens: t } = useTheme();

  if (!proxData) return null;

  return (
    <div className="px-4 mt-1" data-testid="preview-block">
      {/* Header sezione PROSSIMA TERAPIA (Q-UX.4 letterale). */}
      <div
        className="my-4 py-2 px-3 rounded-md flex items-center justify-center gap-2"
        style={{ background: t.dateSepBgStrong }}
        data-testid="preview-header"
      >
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: t.dateSepTx }}
        >
          PROSSIMA TERAPIA · {proxData.dateLabel}
        </span>
      </div>

      {/* Cards con opacity ridotta (Q-UX.4: preview non interattiva). */}
      <div className="opacity-70">
        {proxData.groups.map((group, gIdx) => (
          <div key={`prox-g${gIdx}`} className="mb-3">
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-1"
              style={{ color: t.textSecondary }}
            >
              ORE {group.primaOra}
              {group.descrizioneMomento
                ? ` — ${group.descrizioneMomento.toUpperCase()}`
                : ""}
            </div>
            {group.entries.map((entry) => (
              <PreviewCard key={entry.key} entry={entry} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
