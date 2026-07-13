// ============================================================
// FormCheckbox -- labelled checkbox.
// Extracted from FarmaciTab.jsx (deferito 45, par.22.198-undecies):
// mechanical refactor, behavior-invariant. One component per file
// as per project rules.
// ============================================================

export default function FormCheckbox({ id, label, checked, onChange, theme: t }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm"
      style={{ color: t.textPrimary }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
