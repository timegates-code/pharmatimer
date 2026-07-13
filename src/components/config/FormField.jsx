// ============================================================
// FormField -- labelled input with optional warning.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

export default function FormField({ id, label, value, onChange, type, theme: t, warning, required }) {
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
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        className="rounded px-3 py-2 border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
      {warning && (
        <p className="text-xs" role="status" style={{ color: t.red }}>
          {warning}
        </p>
      )}
    </div>
  );
}
