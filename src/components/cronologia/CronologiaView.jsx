// ============================================================
// CronologiaView — vista Log (Sessione N+2 par.11.U, s.6.215).
//
// Scope minimo §22.69 (Q-LOG.1=a + Q-LOG.2=a + Q-LOG.3=a + Q-LOG.4=a):
//   - filtri: data (from/to) + farmaco singolo/tutti
//   - tabella 5 colonne: data, farmaco, ora_prev, ora_eff, stato (badge)
//   - read-only puro (no edit, no delete, no undo)
//   - in-memory: fetch via repository.getLogByRange() onMount/on filters change
//
// Deviazione s.6.215.A formalizzata in selectors.js:
//   selectLogEntriesFiltered opera su array locale (non state), perche
//   state.plan e limitato a [today-PLAN_DAYS_BEFORE, today+PLAN_DAYS_AFTER]
//   (Spec §3.8) mentre Log range va oltre lo state.plan window.
//
// Deviazione s.6.215.B:
//   STATO_LABELS + STATO_COLORS inline (no centralizzazione utility/statoLabel.js).
//   Drift-doc-N18 carry-forward batch s.6.217 N+4 cleanup.
//
// Format ora_effettiva: known limitation mix HH:MM vs ISO datetime
// (drift-doc-N16 v3.1.0 known limitation). formatOraDisplay defensive
// extract last 5 chars if length > 5, else passthrough.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../state/AppContext.jsx";
import { selectFarmaci } from "../../state/selectors.js";
import { selectLogEntriesFiltered } from "../../state/selectors.js";
import { repo } from "../../data/repository/index.js";
import { Badge } from "../shared/Badge.jsx";
import { useTheme } from "../../hooks/useTheme.js";

// Stato → label IT (s.6.215.B inline mapping)
const STATO_LABELS = {
  prevista: "Prevista",
  presa: "Presa",
  saltata: "Saltata",
  sospesa: "Sospesa",
  ricalcolata: "Ricalcolata",
};

// Stato → Badge colors (light theme baseline; theme-aware refactor scope futuro v3.1.x)
const STATO_COLORS = {
  prevista: { bg: "#E5E7EB", text: "#374151", border: "#9CA3AF" },
  presa: { bg: "#D1FAE5", text: "#065F46", border: "#10B981" },
  saltata: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  sospesa: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  ricalcolata: { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" },
};

// Compute today's ISO date (YYYY-MM-DD) without timezone surprises.
function toIsoDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Display HH:MM (defensive vs mix-format HH:MM | ISO 'YYYY-MM-DDTHH:MM' | null).
function formatOraDisplay(s) {
  if (s == null || s === "") return "—";
  if (typeof s !== "string") return String(s);
  if (s.length > 5 && s.includes("T")) return s.slice(11, 16);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

// Display data YYYY-MM-DD → DD/MM/YY (IT compact, Q-LOG.2=a "compatto").
function formatDataDisplay(dataStr) {
  if (typeof dataStr !== "string" || dataStr.length < 10) return dataStr ?? "";
  const [y, m, d] = dataStr.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const fmtDateInput = toIsoDateStr;

export default function CronologiaView() {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const farmaci = selectFarmaci(state) || [];

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return fmtDateInput(d);
  }, [today]);
  const defaultTo = useMemo(() => fmtDateInput(today), [today]);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [farmacoId, setFarmacoId] = useState("__all__");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repo
      .getLogByRange(from, to)
      .then((rows) => {
        if (!cancelled) setLogs(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        // Defensive: known limitation v3.1.0, no toast UX in scope minimo §11.U.
        console.error("[CronologiaView] getLogByRange failed:", err);
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const filtered = useMemo(() => {
    const fid = farmacoId === "__all__" ? null : Number(farmacoId);
    return selectLogEntriesFiltered(logs, { from, to, farmacoId: fid });
  }, [logs, from, to, farmacoId]);

  const farmacoNameById = useMemo(() => {
    const m = new Map();
    for (const f of farmaci) m.set(f.id, f.nome ?? `#${f.id}`);
    return m;
  }, [farmaci]);

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto" data-testid="log-view">
      <h1 className="text-xl font-bold mb-3">Storico assunzioni</h1>

      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <label className="flex flex-col text-sm">
          <span className="opacity-70 mb-1">Da</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded px-2 py-1.5 border text-sm"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
              colorScheme: "light dark",
            }}
            data-testid="log-filter-from"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="opacity-70 mb-1">A</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="rounded px-2 py-1.5 border text-sm"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
              colorScheme: "light dark",
            }}
            data-testid="log-filter-to"
          />
        </label>
        <label className="flex flex-col text-sm flex-1 min-w-[140px]">
          <span className="opacity-70 mb-1">Farmaco</span>
          <select
            value={farmacoId}
            onChange={(e) => setFarmacoId(e.target.value)}
            className="rounded px-2 py-1.5 border text-sm"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
              colorScheme: "light dark",
            }}
            data-testid="log-filter-farmaco"
          >
            <option value="__all__">Tutti i farmaci</option>
            {farmaci.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <p className="text-sm opacity-60 mb-2" data-testid="log-loading">
          Caricamento…
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div
          className="text-sm opacity-70 py-8 text-center"
          data-testid="log-empty-state"
        >
          Nessuna assunzione registrata nel periodo selezionato.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-testid="log-table">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2 font-medium">Data</th>
                <th className="py-2 pr-2 font-medium">Farmaco</th>
                <th className="py-2 pr-2 font-medium">Prev</th>
                <th className="py-2 pr-2 font-medium">Eff</th>
                <th className="py-2 pr-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const colors =
                  STATO_COLORS[entry.stato] ?? STATO_COLORS.prevista;
                const label = STATO_LABELS[entry.stato] ?? entry.stato;
                const rowKey = `${entry.id ?? `${entry.farmaco_id}-${entry.data}-${entry.dose_numero}`}`;
                return (
                  <tr key={rowKey} className="border-b" data-testid="log-row">
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatDataDisplay(entry.data)}
                    </td>
                    <td className="py-1.5 pr-2">
                      {farmacoNameById.get(entry.farmaco_id) ??
                        `#${entry.farmaco_id}`}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatOraDisplay(entry.ora_prevista)}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {formatOraDisplay(entry.ora_effettiva)}
                    </td>
                    <td className="py-1.5 pr-2">
                      <Badge
                        label={label}
                        bg={colors.bg}
                        text={colors.text}
                        border={colors.border}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
