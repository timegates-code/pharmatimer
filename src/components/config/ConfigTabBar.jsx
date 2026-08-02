import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';
import IndicatoreCoda from '../shared/IndicatoreCoda.jsx';

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
// Token usage:
//   - headerBg / headerBorder : sfondo + bordo inferiore della bar
//   - navActive               : colore label e underline tab attiva
//   - subTabInactive          : colore label tab inattiva
//
// 8d-B CP4 (§6.81 / AMB-8d-B.A): switched from `navInactive` to dedicated
// `subTabInactive` token. The shared `navInactive` sits below WCAG AA UI
// 3:1 contrast threshold against headerBg in both modes (2.05 dark /
// 2.41 light). NavBar bottom keeps `navInactive` (different design
// pattern: icon-prominent + weak-label helper).
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

// par.198-bis (P4+P5): order Farmaci/Profili/Sistema; sub-tab label
// 'Sistema' replaces 'Impostazioni' (route unchanged, M3-B batch).
const TABS = [
  { to: '/config/farmaci',      label: 'Farmaci' },
  { to: '/config/profili',      label: 'Profili' },
  { to: '/config/impostazioni', label: 'Sistema' },
];

export default function ConfigTabBar({ onTabClick, headerRef } = {}) {
  const { tokens: t } = useTheme();
  return (
    <div
      ref={headerRef}
      className="sticky top-0 z-30 flex flex-col gap-2 px-4 py-3 border-b"
      style={{
        background: t.headerBg,
        borderColor: t.headerBorder,
        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
      }}
    >
      {/* SENTINEL_QTRABEAZIONE_FASCIA -- Q-ROSONE-4=A: il root e un
          contenitore e il role tablist sta sul <nav> interno coi soli
          tre NavLink, cosi il gruppo annunciato come linguette non
          acquista un figlio non-tab. Q-TRABEAZIONE-5=A: la spaziatura e
          `flex flex-col gap-2` e MAI un margine sullo indicatore, perche
          il gap di flexbox nasce solo FRA nodi resi e IndicatoreCoda
          rende null quando `coda` e null: lo stato "non ancora noto"
          costa cosi altezza ZERO, e allo avvio il layout non salta.
          I tre NavLink qui sotto sono INVARIATI alla lettera, rientro
          compreso: ri-indentarli toccherebbe righe dichiarate invarianti
          e JSX non ne risente. */}
      <nav
        role="tablist"
        aria-label="Sezioni Impostazioni"
        className="flex items-center gap-6"
      >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          onClick={(e) => onTabClick?.(tab.to, e)}
          className="text-sm font-medium px-2 -mx-2 py-2 -my-2 outline-none"
          style={({ isActive }) => ({
            color: isActive ? t.navActive : t.subTabInactive,
            borderBottom: isActive
              ? `2px solid ${t.navActive}`
              : '2px solid transparent',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
      </nav>
      <IndicatoreCoda />
    </div>
  );
}
