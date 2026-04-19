// ============================================================
// NavBar — bottom tab bar.
// Sessione 7b-1 (AMB-7b.E): rewrite token-aware via `useTheme()`.
// Routing stays `NavLink` + `useLocation()` (Phase 2 router, unchanged
// since Step 1). The four tabs and their SVG path data are 1:1 from the
// v5 mockup (line 870). Active tab = first path segment match, so
// `/config/*` keeps the Config tab highlighted across subroutes.
// ============================================================

import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';

const TABS = [
  { to: '/oggi',   label: 'Oggi',   d: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { to: '/log',    label: 'Log',    d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8' },
  { to: '/export', label: 'Export', d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { to: '/config', label: 'Config', d: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
];

export default function NavBar() {
  const { tokens: t } = useTheme();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ background: t.navBg, borderTop: `1px solid ${t.navBorder}` }}
    >
      <div className="flex items-center justify-around py-2 pb-6 max-w-md mx-auto">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.to);
          const color = active ? t.navActive : t.navInactive;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={color} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={tab.d} />
              </svg>
              <span className="text-xs font-medium" style={{ color }}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
