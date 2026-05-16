// ============================================================
// NavBar — bottom tab bar.
// Sessione 7b-1 (AMB-7b.E): rewrite token-aware via `useTheme()`.
// Routing stays `NavLink` + `useLocation()` (Phase 2 router, unchanged
// since Step 1). The four tabs and their SVG path data are 1:1 from the
// v5 mockup (line 870). Active tab = first path segment match, so
// `/config/*` keeps the Impostazioni tab highlighted across subroutes.
// ============================================================

import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';

const TABS = [
  { to: '/oggi',   label: 'Oggi',   d: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { to: '/log',    label: 'Log',    d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8' },
  { to: '/export', label: 'Export', d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { to: '/config', label: 'Impostazioni', d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
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
