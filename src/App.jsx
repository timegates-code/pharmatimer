import { Routes, Route, Navigate } from "react-router-dom";
import OggiView from "./components/oggi/OggiView.jsx";
import ConfigView from "./components/config/ConfigView.jsx";
import NavBar from "./components/shared/NavBar.jsx";
import UpdatePrompt from "./components/shared/UpdatePrompt.jsx";
import ErrorSurface from "./components/shared/ErrorSurface.jsx";
import ErrorAnnouncer from "./components/shared/ErrorAnnouncer.jsx";
import Toast from "./components/shared/Toast.jsx";
import OnboardingModal from "./components/onboarding/OnboardingModal.jsx";
import { useTheme } from "./hooks/useTheme.js";
import { useApp } from "./state/AppContext.jsx";
import { selectImpostazione, selectFarmaciAttivi } from "./state/selectors.js";

// Shell with bottom nav and route outlets.
// Only Oggi and Config are implemented in Fase 2; Log and Export stub to redirect.
//
// Sessione 7b-1 (AMB-7b.D): `ThemedShell` wraps the whole surface and paints
// pageBg + textPrimary on the root. Without it, the Log/Export placeholders
// (below) and ConfigView (pre-port) would show the browser default white
// background under dark mode, breaking the UX continuity.
//
// CP5 v3.0.0 Step 1 (§6.176): `<Toast />` mounted at App level (inside
// ThemedShell, sopra Routes) so the global ephemeral message survives
// route changes Oggi ↔ Config without re-mount cycles. The Toast is
// position:fixed and reads `state.toast` via selectToast — it renders
// nothing when no toast is set, so the mount is essentially free.

function ThemedShell({ children }) {
  const { tokens: t } = useTheme();
  return (
    <div
      style={{
        background: t.pageBg,
        color: t.textPrimary,
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  return (
    <ThemedShell>
      <ErrorAnnouncer />
      <ErrorSurface />
      <Toast />
      <OnboardingGate />
      <Routes>
        <Route path="/" element={<Navigate to="/oggi" replace />} />
        <Route path="/oggi" element={<OggiView />} />
        <Route path="/config/*" element={<ConfigView />} />
        <Route path="/log" element={<Placeholder title="Log" />} />
        <Route path="/export" element={<Placeholder title="Export" />} />
        <Route path="*" element={<Navigate to="/oggi" replace />} />
      </Routes>
      <UpdatePrompt />
      <NavBar />
    </ThemedShell>
  );
}

function OnboardingGate() {
  const { state, actions } = useApp();
  const onboardingCompleted = selectImpostazione(state, "onboarding_completed");
  const farmaciAttivi = selectFarmaciAttivi(state);

  // Gate: only when init is complete AND onboarding flag not set.
  // par.6.167: mounted in App.jsx (not AppProvider, which is a state-only shell).
  const open = state.status === "ready" && onboardingCompleted !== 1;
  if (!open) return null;

  // Q-UX.3 (migration users): pre-populate nome from existing setting
  // so a user who already had `nome_utente` can confirm rather than retype.
  const defaultNome = selectImpostazione(state, "nome_utente") ?? "";

  const handleComplete = ({ nome, mode }) => {
    actions.completeOnboarding(nome, mode);
  };

  return (
    <OnboardingModal
      open={open}
      defaultNome={defaultNome}
      farmaciAttiviCount={farmaciAttivi.length}
      onComplete={handleComplete}
    />
  );
}

function Placeholder({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm opacity-70">Non ancora implementato in questa fase.</p>
      </div>
    </div>
  );
}
