import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CronologiaView from "./components/cronologia/CronologiaView.jsx";
import OggiView from "./components/oggi/OggiView.jsx";
import ConfigView from "./components/config/ConfigView.jsx";
import NavBar from "./components/shared/NavBar.jsx";
import UpdatePrompt from "./components/shared/UpdatePrompt.jsx";
import ErrorSurface from "./components/shared/ErrorSurface.jsx";
import ErrorAnnouncer from "./components/shared/ErrorAnnouncer.jsx";
import Toast from "./components/shared/Toast.jsx";
import OnboardingModal from "./components/onboarding/OnboardingModal.jsx";
import LoginDialog from "./components/auth/LoginDialog.jsx";
import { useTheme } from "./hooks/useTheme.js";
import { useApp } from "./state/AppContext.jsx";
import { selectImpostazione, selectFarmaciAttivi } from "./state/selectors.js";
import { shouldUseApiRepo } from "./data/repository/index.js"; // SENTINEL_N5QC_CP1_LOGINGATE_SHARED_GATE

// Shell with bottom nav and route outlets.
// Oggi, Config, and Cronologia are functional; Export route redirects to Cronologia (s.6.216 N+3, ratifica N+4).
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
      <LoginGate />
      <SessionExpiryGate />
      <Routes>
        <Route path="/" element={<Navigate to="/oggi" replace />} />
        <Route path="/oggi" element={<OggiView />} />
        <Route path="/config/*" element={<ConfigView />} />
        <Route path="/log" element={<CronologiaView />} />
        <Route path="/export" element={<Navigate to="/log" replace />} />
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

// CP4 N+5.P-bis (par.11.U-S3): SENTINEL_N5P_CP4_LOGINGATE -- do not remove.
// Gates the app behind LoginDialog when running against the API backend
// (pharmatimer.useApiRepo === "1") and no user token is present yet
// (drift-N5P.6 double gate). On successful login LoginDialog persists the
// token; we reload (D3') so AppContext init re-fetches with the X-User-Token.
function LoginGate() {
  const { tokens: t } = useTheme();
  let useApiRepo = false;
  let hasToken = false;
  try {
    useApiRepo = shouldUseApiRepo(); // env (build Mini) OR localStorage (dev) -- gate condiviso
    hasToken = !!localStorage.getItem("pharmatimer.userToken");
  } catch {
    return null;
  }
  if (!useApiRepo || hasToken) return null;
  return <LoginDialog theme={t} onSuccess={() => window.location.reload()} />;
}

// SENTINEL_N5QC_CP4BIS_AUTOCLEAR -- drift-N53: auto-clear di un token stale.
// Pure helper (testabile senza mockare reload): l'auto-clear scatta SOLO se
// l'errore corrente e UNAUTHORIZED E un token e presente in localStorage.
//   - token assente (S-A): no-op -> LoginGate mostra LoginDialog (niente loop).
//   - token presente invalido (S-B) o 401 mid-sessione (S-C): clear + reload.
//   - DB_UNAVAILABLE / NO_ACTIVE_PROFILE con token valido: no-op (nessun logout indebito).
export function shouldAutoClearUnauthorized(errorCode, hasToken) {
  return errorCode === 'UNAUTHORIZED' && hasToken === true;
}

function SessionExpiryGate() {
  const { state } = useApp();
  useEffect(() => {
    let hasToken = false;
    try {
      hasToken = !!localStorage.getItem("pharmatimer.userToken");
    } catch {
      return;
    }
    if (!shouldAutoClearUnauthorized(state.error?.code, hasToken)) return;
    try {
      localStorage.removeItem("pharmatimer.userToken");
    } catch {
      /* localStorage non disponibile: nulla da ripulire */
    }
    window.location.reload();
  }, [state.error]);
  return null;
}
