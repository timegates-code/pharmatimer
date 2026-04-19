// ============================================================
// Interactive badge — dashed border, shadow, chevron, scale on press.
// Port 1:1 from v5 mockup lines 347-361.
// ============================================================

import { IconChevron } from './Icons.jsx';

/**
 * @param {{
 *   label: React.ReactNode,
 *   bg: string,
 *   text: string,
 *   border: string,
 *   icon?: React.ReactNode,
 *   onClick?: (e: React.MouseEvent) => void,
 * }} props
 */
export function TapBadge({ label, bg, text, border, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap cursor-pointer active:scale-95 transition-transform"
      style={{
        background: bg,
        color: text,
        border: `1.5px dashed ${border}`,
        boxShadow: `0 1px 4px ${border}30`,
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
      <IconChevron color={text} />
    </button>
  );
}
