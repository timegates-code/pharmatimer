// ============================================================
// Static badge — non-clickable, flat, solid border.
// Port 1:1 from v5 mockup lines 337-345.
// Tokens for bg/text/border are passed by the caller (AMB-7a.I).
// ============================================================

/**
 * @param {{label: React.ReactNode, bg: string, text: string, border: string}} props
 */
export function Badge({ label, bg, text, border }) {
  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}
