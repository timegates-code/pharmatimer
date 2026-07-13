// ============================================================
// OccorrenzaRow -- extracted component.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

// ============================================================
// OccorrenzaRow — riga singola (data, ora) per fisso_date.
// SENTINEL_PAR_22_154_FISSODATE
// Blocco 3 (par.22.155): input ora/data + bottone rimozione ingranditi
// (min-h-[44px], text-base) per accessibilita anziani; type="time" nativo
// invariato -> contratto 'HH:MM' preservato. SENTINEL_PAR_22_155_PICKER_A11Y
// ============================================================

export default function OccorrenzaRow({ index, occorrenza, onChange, onRemove, theme: t }) {
  const dataId = `occ-data-${index}`;
  const oraId = `occ-ora-${index}`;
  return (
    <div
      data-testid={`occorrenza-row-${index}`}
      className="rounded border p-3 flex items-end gap-2"
      style={{ background: t.modalBg, borderColor: t.tapBd }}
    >
      <div className="flex flex-col gap-1 flex-1">
        <label htmlFor={dataId} className="text-sm font-medium" style={{ color: t.textPrimary }}>
          Data
        </label>
        <input
          id={dataId}
          type="date"
          value={occorrenza.data || ''}
          onChange={(e) => onChange('data', e.target.value)}
          className="rounded px-3 py-2.5 border text-base min-h-[44px]"
          style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}
        />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <label htmlFor={oraId} className="text-sm font-medium" style={{ color: t.textPrimary }}>
          Orario
        </label>
        <input
          id={oraId}
          type="time"
          value={occorrenza.ora || ''}
          onChange={(e) => onChange('ora', e.target.value)}
          className="rounded px-3 py-2.5 border text-base min-h-[44px] tabular-nums"
          style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi data ${index + 1}`}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] text-base rounded border"
        style={{ background: t.modalBg, color: t.red, borderColor: t.red }}
      >
        ✕
      </button>
    </div>
  );
}

