// ============================================================
// OrarioRow -- single dose timing row.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

// ANCORA_OPTIONS, minutesToHHMM and hhmmToMinutes migrate here as
// module-private symbols (sole consumer measured: this component).

const ANCORA_OPTIONS = [
  { value: 'sveglia',   label: 'Sveglia' },
  { value: 'colazione', label: 'Colazione' },
  { value: 'pranzo',    label: 'Pranzo' },
  { value: 'cena',      label: 'Cena' },
  { value: 'sonno',     label: 'Sonno' },
  { value: 'assoluto',  label: 'Orario assoluto' },
];

function minutesToHHMM(min) {
  const m = ((Number(min) || 0) % 1440 + 1440) % 1440;
  const h = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${h}:${mm}`;
}

function hhmmToMinutes(hhmm) {
  if (typeof hhmm !== 'string' || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function OrarioRow({ index, orario, oraPreview, onChange, theme: t }) {
  const ancoraId = `orario-ancora-${index}`;
  const offsetId = `orario-offset-${index}`;
  const descrId  = `orario-descr-${index}`;

  return (
    <div
      data-testid={`orario-row-${index}`}
      className="rounded border p-3 flex flex-col gap-2"
      style={{ background: t.modalBg, borderColor: t.tapBd }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono uppercase tracking-wider"
          style={{ color: t.textSecondary }}
        >
          Dose #{index + 1}
        </span>
        {oraPreview && (
          <span
            className="text-sm font-mono tabular-nums"
            style={{ color: t.textPrimary }}
          >
            {oraPreview}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={ancoraId}
            className="text-xs font-medium"
            style={{ color: t.textPrimary }}
          >
            {/* B20 par.22.198-ter (D7): 'Ancora' era gergo ambiguo per
                utenti anziani. SENTINEL_PAR_22_198_TER_B20 */}
            Rispetto a
          </label>
          <select
            id={ancoraId}
            value={orario.ancora_riferimento}
            onChange={(e) => onChange('ancora_riferimento', e.target.value)}
            className="rounded px-2 py-1.5 border text-sm"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          >
            {ANCORA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* P3 par.22.198-ter: con ancora=assoluto l'offset (minuti da
            mezzanotte) si edita come input time — elderly-friendly.
            SENTINEL_PAR_22_198_TER_P3_ROW */}
        {orario.ancora_riferimento === 'assoluto' ? (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={offsetId}
              className="text-xs font-medium"
              style={{ color: t.textPrimary }}
            >
              Orario
            </label>
            <input
              id={offsetId}
              type="time"
              value={minutesToHHMM(orario.offset_minuti)}
              onChange={(e) => onChange('offset_minuti', hhmmToMinutes(e.target.value))}
              className="rounded px-2 py-1.5 border text-sm tabular-nums"
              style={{
                background: t.modalBg,
                color: t.textPrimary,
                borderColor: t.tapBd,
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={offsetId}
              className="text-xs font-medium"
              style={{ color: t.textPrimary }}
            >
              Offset (min)
            </label>
            <input
              id={offsetId}
              type="number"
              value={orario.offset_minuti}
              onChange={(e) => onChange('offset_minuti', e.target.value)}
              className="rounded px-2 py-1.5 border text-sm tabular-nums"
              style={{
                background: t.modalBg,
                color: t.textPrimary,
                borderColor: t.tapBd,
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={descrId}
          className="text-xs font-medium"
          style={{ color: t.textPrimary }}
        >
          Descrizione (opz.)
        </label>
        <input
          id={descrId}
          type="text"
          value={orario.descrizione_momento || ''}
          onChange={(e) => onChange('descrizione_momento', e.target.value)}
          className="rounded px-2 py-1.5 border text-sm"
          style={{
            background: t.modalBg,
            color: t.textPrimary,
            borderColor: t.tapBd,
          }}
        />
      </div>
    </div>
  );
}
