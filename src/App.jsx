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
import { ONBOARDING_LS_KEY } from "./data/db.js"; // SENTINEL_BUGM_S6251_LS_IMPORT

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

// BUG-m fix (s.6.251): pure decision core of OnboardingGate (pattern
// loginGateAction / parseMagicLinkToken — testable without DOM).
// Opens ONLY when init is complete AND neither the IndexedDB flag nor
// the localStorage mirror marks onboarding as completed.
// SENTINEL_BUGM_S6251_HELPER
export function shouldOpenOnboarding(status, onboardingCompleted, lsValue) {
  if (status !== "ready") return false;
  if (onboardingCompleted === 1) return false;
  if (lsValue === "1") return false;
  return true;
}

function OnboardingGate() {
  const { state, actions } = useApp();
  const onboardingCompleted = selectImpostazione(state, "onboarding_completed");
  const farmaciAttivi = selectFarmaciAttivi(state);

  // Gate: only when init is complete AND onboarding flag not set.
  // par.6.167: mounted in App.jsx (not AppProvider, which is a state-only shell).
  // BUG-m fix (s.6.251): dual-read gate — IndexedDB flag OR the
  // localStorage mirror written by completeOnboarding. The mirror
  // survives mobile reloads where IndexedDB is wiped (Finding #10).
  // Pure helper for testability (pattern parseMagicLinkToken).
  // SENTINEL_BUGM_S6251_GATE
  let lsOnboarding = null;
  try {
    lsOnboarding = localStorage.getItem(ONBOARDING_LS_KEY);
  } catch {
    /* ignore storage errors */
  }
  const open = shouldOpenOnboarding(state.status, onboardingCompleted, lsOnboarding);
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
      apiMode={shouldUseApiRepo()}
      onComplete={handleComplete}
    />
  );
}

// SENTINEL_M2A_MAGIC_LINK -- par.22.191 (magic link E-1-alt, ratified par.22.190).
// Pure helpers (pattern shouldAutoClearUnauthorized): testable without DOM,
// no mocks of location / localStorage / reload needed.
//
// parseMagicLinkToken: extracts the user token from a magic-link fragment.
// Accepts ONLY '#token=<tok>' where <tok> is URL-safe base64 charset
// [A-Za-z0-9_-], min length 20. Backend token_plain is empirically 43 chars
// of exactly that charset (probe par.22.191); the 20 floor tolerates future
// regeneration schemes while rejecting spurious fragments. Any malformed or
// unknown hash returns null (Q3=A: total no-op, hash left untouched, the
// pre-existing LoginDialog flow is unchanged). The token value is NEVER
// logged, rendered, or included in error messages.
export function parseMagicLinkToken(hash) {
  if (typeof hash !== "string") return null;
  const m = /^#token=([A-Za-z0-9_-]{20,})$/.exec(hash);
  return m ? m[1] : null;
}

// loginGateAction: pure decision core of LoginGate.
//   - "apply-magic": valid fragment token -> persist + clean URL + reload.
//     Q1=A: the fragment OVERRIDES any stored token, enabling remote token
//     revocation+regeneration (runbook par.5.4) with zero manual storage
//     cleanup; a stale/revoked stored token is otherwise recovered by
//     SessionExpiryGate (401 -> auto-clear -> reload -> LoginDialog).
//   - "show-login": API repo active, no fragment token, no stored token.
//   - "pass": gate renders nothing (local repo mode, or token already set).
export function loginGateAction(useApiRepo, hash, hasToken) {
  if (!useApiRepo) return "pass";
  if (parseMagicLinkToken(hash) !== null) return "apply-magic";
  return hasToken ? "pass" : "show-login";
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
  const action = loginGateAction(useApiRepo, window.location.hash, hasToken);
  if (action === "apply-magic") {
    // SENTINEL_M2A_MAGIC_LINK ingress: fragment -> localStorage, then the URL
    // is cleaned via history.replaceState BEFORE reload -> no reload loop, no
    // history entry; the fragment never reaches the server -> no uvicorn log.
    const magicToken = parseMagicLinkToken(window.location.hash);
    try {
      localStorage.setItem("pharmatimer.userToken", magicToken);
    } catch {
      return null; // storage unavailable: nothing persisted, render nothing
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.location.reload(); // D3' reuse: AppContext init re-fetches with X-User-Token
    return null;
  }
  if (action !== "show-login") return null;
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
