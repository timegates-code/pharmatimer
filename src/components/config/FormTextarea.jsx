// ============================================================
// FormTextarea -- labelled textarea.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

export default function FormTextarea({ id, label, value, onChange, theme: t }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="rounded px-3 py-2 border resize-y"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
    </div>
  );
}
