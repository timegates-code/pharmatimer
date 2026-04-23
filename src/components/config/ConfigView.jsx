import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ProfiliTab from './ProfiliTab.jsx';
import FarmaciTab from './FarmaciTab.jsx';
import ImpostazioniTab from './ImpostazioniTab.jsx';
import ConfigTabBar from './ConfigTabBar.jsx';
import UnsavedChangesModal from './UnsavedChangesModal.jsx';

// ============================================================
// ConfigView — shell of the /config/* nested routing subtree.
// ============================================================
//
// Scope CP2-CP7 Sessione 8a:
//   - CP2: nested Routes + tab placeholders.
//   - CP3: ConfigTabBar mounted above Routes.
//   - CP7 (AMB-8a.E, §11 decision point "useBlocker non
//     disponibile"): dirty state LIFTED from ImpostazioniTab up
//     to ConfigView. Sub-tab clicks in ConfigTabBar are
//     intercepted via `onTabClick(to, e)` and, when dirty, the
//     default NavLink behaviour is prevented and an
//     UnsavedChangesModal is shown. On "Scarta e continua" the
//     dirty flag is reset and the navigation proceeds via
//     `useNavigate`.
//
// Scope OUT (intentional for 8a):
//   - NavBar bottom clicks (cross-view /oggi, /log, etc.) — they
//     are NOT intercepted. Users who leave Config via the bottom
//     nav lose the edit; acceptable because 8a treats unsaved
//     changes as an intra-Config concern. Full cross-app guard
//     requires `useBlocker` + DataRouter migration, deferred.
//   - beforeunload (Cmd+R / tab close): not wired here; deferred
//     to 8d polish.
//   - Focus-trap / full a11y of the modal: deferred to 8d
//     (§11 "Out of scope").
//
// Routing contract unchanged from CP2 (AMB-8a.A + rettifica F7).
// The parent route in App.jsx is <Route path="/config/*" …>,
// children below use RELATIVE paths (no leading slash).

export default function ConfigView() {
  const [dirty, setDirty] = useState(false);
  // pendingNavTo: null when idle; a relative tab name ('profili' /
  // 'farmaci' / 'impostazioni') when a dirty-state navigation was
  // intercepted and awaits user decision.
  const [pendingNavTo, setPendingNavTo] = useState(null);
  const navigate = useNavigate();

  // Intercept only when dirty. Non-dirty click → NavLink default
  // behaviour (preventDefault not called).
  function handleTabClick(to, e) {
    if (dirty) {
      e.preventDefault();
      setPendingNavTo(to);
    }
  }

  function handleDiscard() {
    setDirty(false);
    const target = pendingNavTo;
    setPendingNavTo(null);
    // Relative navigate resolves against /config/*: 'profili' →
    // /config/profili.
    navigate(target);
  }

  function handleCancel() {
    setPendingNavTo(null);
  }

  return (
    <div className="pb-20">
      <ConfigTabBar onTabClick={handleTabClick} />
      <Routes>
        <Route index element={<Navigate to="impostazioni" replace />} />
        <Route path="profili" element={<ProfiliTab />} />
        <Route path="farmaci" element={<FarmaciTab />} />
        <Route
          path="impostazioni"
          element={<ImpostazioniTab dirty={dirty} setDirty={setDirty} />}
        />
        <Route path="*" element={<Navigate to="impostazioni" replace />} />
      </Routes>
      {pendingNavTo !== null && (
        <UnsavedChangesModal
          onCancel={handleCancel}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
