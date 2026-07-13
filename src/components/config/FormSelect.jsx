// ============================================================
// FormSelect -- labelled select with placeholder.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

export default function FormSelect({ id, label, value, onChange, options, theme: t, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        className="rounded px-3 py-2 border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      >
        <option value="" disabled>— seleziona —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
