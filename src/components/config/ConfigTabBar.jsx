import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';

// ============================================================
// ConfigTabBar — top sub-tab bar for the /config/* subtree.
// ============================================================
//
// Scope CP3 Sessione 8a (AMB-8a.A). Pattern analogo a NavBar.jsx
// (token-aware via useTheme + NavLink) ma con:
//   - layout TOP (non fixed bottom come NavBar)
//   - solo label text, no icone (il mockup v5 non fornisce
//     icone per le sub-tab Config)
//   - 3 tab letterali AMB-A: Profili / Farmaci / Impostazioni
//
// Token reuse (nessun nuovo token — §11 CP3 "solo se mancano"):
//   - headerBg / headerBorder : sfondo + bordo inferiore della bar
//   - navActive / navInactive : colore label e underline active
//
// Absolute paths (`to="/config/profili"` etc.): §6.104 fix
// (Sessione 8d-A-continue-2). Sotto `v7_relativeSplatPath: true`
// opt-in (§6.84, main.jsx), i path relativi dentro lo splat route
// `/config/*` risolvono contro l'URL corrente (incluso il segmento
// splat) — causerebbe loop di navigazione cross-tab. Gli absolute
// path bypassano le regole di resolution.
//
// NavLink (react-router-dom v6.30): `isActive` è auto-derivato
// dal match URL, e `aria-current="page"` è auto-applicato al DOM
// quando attivo. Niente handling manuale — siamo conformi a11y.
//
// role="tablist" + aria-label: semantic per screen reader,
// coerente con la struttura di 3 tab navigazionali.

const TABS = [
  { to: '/config/profili',      label: 'Profili' },
  { to: '/config/farmaci',      label: 'Farmaci' },
  { to: '/config/impostazioni', label: 'Impostazioni' },
];

export default function ConfigTabBar({ onTabClick } = {}) {
  const { tokens: t } = useTheme();
  return (
    <nav
      role="tablist"
      aria-label="Sezioni Config"
      className="flex items-center gap-6 px-4 py-3 border-b"
      style={{ background: t.headerBg, borderColor: t.headerBorder }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          onClick={(e) => onTabClick?.(tab.to, e)}
          className="text-sm font-medium pb-1 outline-none"
          style={({ isActive }) => ({
            color: isActive ? t.navActive : t.navInactive,
            borderBottom: isActive
              ? `2px solid ${t.navActive}`
              : '2px solid transparent',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
