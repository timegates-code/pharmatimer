import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { selectImpostazione } from '../../state/selectors.js';
import { db } from '../../data/db.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import ConfirmModal from '../shared/ConfirmModal.jsx';

// ============================================================
// ImpostazioniTab — sezioni Config utente.
// ============================================================
//
// Scope CP4 Sessione 8a (AMB-8a.C + §6.77):
//   - Sezione Nome: input controlled + Salva esplicito, trim mandatoria.
//   - Source of truth: state.impostazioni.nome_utente (read via
//     selectImpostazione; il mirror state.nomeUtente è stato rimosso
//     in §6.77).
//   - Wrapper-level dirty flag: predisposto per CP5 (sezione Tema,
//     no dirty) e CP7 (useBlocker unsaved changes modal). In CP4
//     dirty è visibile solo come gate del bottone Salva + hint
//     inline "nome non può essere vuoto".
//
// Scope CP5 Sessione 9-B parte 3/3 (AMB-9.F'):
//   - SezioneNotifiche: toggle 4-stati (isStandalone × permission)
//     + banner per !isStandalone e permission denied.
//   - Pending notifications count integrato in SezioneAvanzate (DEV)
//     come 4° campo read-only diagnostic (Q-CP5.3).
//
// Scope CP6 v3.0.0 Step 1 (§6.180-181, Q-UX.7):
//   - SezioneDati (PROD-visibile, non gated DEV) con bottone
//     "Ricomincia da capo" → ConfirmModal danger → thunk resetAllData.
//   - Distinta da SezioneAvanzate esistente (DEV-only diagnostic):
//     "Dati" è dedicata all'azione utente di reset, non al diagnostic
//     panel sviluppo.
//
// L'outer <section data-testid="config-tab-impostazioni"> è la
// convenzione stabile CP2→CP6: i test routing in ConfigView.test.jsx
// dipendono da questo testid, non deve cambiare mai.

function SezioneNome({ dirty, setDirty }) {
  const { state, actions } = useAppContext();
  const { tokens: t } = useTheme();
  const nomeAttuale = selectImpostazione(state, 'nome_utente') ?? '';
  const [value, setValue] = useState(nomeAttuale);

  // §6.82 (8a CP browser): rehydrate on idle→ready transition. At mount
  // time state.status may still be 'idle' and impostazioni empty, so
  // useState captured ''. When init() completes and state updates,
  // nomeAttuale receives the persisted value and this effect syncs it
  // into the local controlled-input state. Subsequent user edits still
  // win — setValue only fires when the *source of truth* changes.
  useEffect(() => { setValue(nomeAttuale); }, [nomeAttuale]);

  const trimmed = value.trim();
  const canSave = dirty && trimmed.length > 0;

  async function handleSave() {
    const result = await actions.setSetting('nome_utente', trimmed);
    if (result?.ok) {
      setDirty(false);
    }
  }

  return (
    <section className="py-4">
      <label htmlFor="impostazioni-nome" className="block text-sm font-medium mb-1">
        Nome
      </label>
      <input
        id="impostazioni-nome"
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        className="rounded px-3 py-2 w-full max-w-sm border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
      {dirty && trimmed.length === 0 && (
        <p className="text-sm mt-1" role="alert">
          Il nome non può essere vuoto.
        </p>
      )}
      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="block mt-3 px-4 py-2 rounded border disabled:opacity-50"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      >
        Salva
      </button>
    </section>
  );
}

// ============================================================
// SezioneTema — 3-state radio (auto | light | dark).
// ============================================================
//
// Scope CP5 Sessione 8a (AMB-8a.C + AMB-8a.F).
//   - Save istantaneo on change (no dirty tracking — pattern accettato
//     per radio group).
//   - Fonte unica: state.impostazioni.tema letto via selectImpostazione.
//     Default 'auto' quando la chiave è assente.
//   - Etichette italiane letterali da §11 CP5:
//     Automatico (segue OS) / Chiaro / Scuro.
//   - Guard no-op: se il click ripropone il valore già selezionato non
//     si dispatcha (evita round-trip repo inutile).
//
// A11y: <fieldset>+<legend>, ciascun <label> wrappa input+text (clic
// su label seleziona il radio, pattern HTML5 standard).

const TEMA_OPTIONS = [
  { value: 'auto',  label: 'Automatico (segue OS)' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark',  label: 'Scuro' },
];

function SezioneTema() {
  const { state, actions } = useAppContext();
  const temaAttuale = selectImpostazione(state, 'tema') ?? 'auto';

  function handleChange(value) {
    if (value === temaAttuale) return;
    actions.setSetting('tema', value);
  }

  return (
    <fieldset className="py-4">
      <legend className="text-sm font-medium mb-2">Tema</legend>
      <div className="flex flex-col gap-2">
        {TEMA_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="tema"
              value={opt.value}
              checked={temaAttuale === opt.value}
              onChange={() => handleChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ============================================================
// SezioneNotifiche — toggle 4-stati Wave B (CP5 Sessione 9-B parte 3/3).
// ============================================================
//
// Decision tree AMB-9.F' literal (§22.20 — fonte autoritativa, non §11
// terminologia drift `not-supported|granted-off|granted-on`):
//
//   isStandalone × permission        UI rendered
//   ─────────────────────────────────────────────────────────
//   !isStandalone × *               banner "Installa sulla home"
//   true × 'default'                toggle off, click → requestEnable
//                                   + hint "Verrà chiesto il permesso"
//   true × 'granted' × enabled=0    toggle off, click → requestEnable
//   true × 'granted' × enabled=1    toggle on,  click → disable
//                                   + hint "Avviso poco prima..."
//   true × 'denied'                 toggle disabilitato + banner
//                                   "Permesso negato — sistema"
//
// `useNotifications` (CP3 §6.123) collassa Notification API mancante su
// permission='denied' (readPermission early-return). Quindi il prompt §11
// `not-supported` non è uno stato esposto in JS — la UI mostra il banner
// "Permesso negato" anche per browser legacy. Documentato come §6.133 in
// CP6 closing.
//
// Toggle pattern: <button role="switch" aria-checked> per a11y standard
// (no checkbox HTML — l'aspetto è tap-target tipo iOS/Android, non
// form input). disabled=true per stato denied (aria-disabled implicito
// via attributo HTML).
//
// Errori `requestEnable`/`disable` sono assorbiti silenziosi: la UI
// si aggiorna automaticamente al re-render dell'hook (state cambia
// via setSetting o defensive revocation check).

function SezioneNotifiche() {
  const { tokens: t } = useTheme();
  const { isStandalone, permission, enabled, requestEnable, disable } = useNotifications();

  const sectionStyle = 'py-4';

  if (!isStandalone) {
    return (
      <fieldset className={sectionStyle}>
        <legend className="text-sm font-medium mb-2">Notifiche</legend>
        <p className="text-sm" style={{ color: t.textPrimary }}>
          Installa PharmaTimer sulla schermata Home per ricevere le notifiche delle dosi.
        </p>
      </fieldset>
    );
  }

  async function handleClick() {
    try {
      if (enabled) {
        await disable();
      } else {
        await requestEnable();
      }
    } catch {
      // Errori `not_standalone` / `permission_denied` sono assorbiti:
      // lo stato dell'hook si auto-aggiorna al prossimo render.
    }
  }

  const isDenied = permission === 'denied';
  const showDefaultHint = permission === 'default' && !enabled;
  const showActiveHint = enabled;

  return (
    <fieldset className={sectionStyle}>
      <legend className="text-sm font-medium mb-2">Notifiche</legend>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={isDenied}
        onClick={handleClick}
        className="px-4 py-2 rounded border disabled:opacity-50"
        style={{
          background: enabled ? t.tapBd : t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      >
        Notifiche dosi
      </button>
      {isDenied && (
        <p className="text-sm mt-2" style={{ color: t.textPrimary }}>
          Permesso negato. Abilita le notifiche dalle impostazioni di sistema (Impostazioni → PharmaTimer → Notifiche).
        </p>
      )}
      {showDefaultHint && (
        <p className="text-sm mt-1" style={{ color: t.textPrimary }}>
          Verrà chiesto il permesso di sistema.
        </p>
      )}
      {showActiveHint && (
        <p className="text-sm mt-1" style={{ color: t.textPrimary }}>
          Avviso poco prima di ogni dose.
        </p>
      )}
    </fieldset>
  );
}

// ============================================================
// SezioneDati — reset "Ricomincia da capo" (CP6 v3.0.0 Step 1).
// ============================================================
//
// Scope CP6 (§11.F + Q-UX.7 §22.41 punto 7):
//   - Bottone "Ricomincia da capo" full-width, stile danger (border
//     + color t.red, background t.modalBg per contrast con SezioneInfo
//     sotto).
//   - Tap apre <ConfirmModal danger> (3° consumer dopo FarmaciTab
//     delete + data_fine-past). Copy §6.180:
//       title:   "Ricomincia da capo?"
//       body:    "Tutti i tuoi dati saranno cancellati: farmaci,
//                 profili personalizzati, log assunzioni. L'azione
//                 non può essere annullata."
//       confirm: "Cancella tutto"
//       cancel:  "Annulla"
//   - Conferma → actions.resetAllData() (§6.180 thunk):
//       1. db.transaction wipe atomico 5 tabelle + re-add profilo
//          "Standard" attivo:1 (evita NO_ACTIVE_PROFILE post-reset).
//       2. await init() ricarica state pulito.
//       3. OnboardingGate riapre automaticamente:
//          impostazioni_app cleared → onboarding_completed assente
//          → gate testa null !== 1 → modale apre (§22.41 Q-UX.7 path
//          ratificato).
//   - PROD-visibile (NON gated import.meta.env.DEV): l'azione è
//     destinata all'utente finale, non è uno strumento sviluppo.
//     Distinta da SezioneAvanzate diagnostic (DEV-only) sopra.
//   - triggerRef sul bottone per restore-focus post-modale (§6.105
//     pattern, useModalA11y già montato in ConfirmModal shared).

function SezioneDati() {
  const { actions } = useAppContext();
  const { tokens: t } = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef(null);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await actions.resetAllData();
      // Su success il modale lo chiudiamo comunque; lo state si è già
      // riallineato via init() interno al thunk, e OnboardingGate
      // riapre automaticamente se il reset è andato a buon fine.
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-4 mt-4 border-t pt-4" style={{ borderTopColor: t.headerBorder }}>
      <h3 className="text-sm font-medium mb-2">Dati</h3>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={submitting}
        className="px-4 py-2 rounded border w-full max-w-sm text-sm font-semibold disabled:opacity-50"
        style={{
          background: t.modalBg,
          color: t.red,
          borderColor: t.red,
        }}
      >
        Ricomincia da capo
      </button>

      <ConfirmModal
        open={confirmOpen}
        triggerRef={triggerRef}
        title="Ricomincia da capo?"
        body={
          <p>
            Tutti i tuoi dati saranno cancellati: farmaci, profili personalizzati,
            log assunzioni. L'azione non può essere annullata.
          </p>
        }
        confirmLabel="Cancella tutto"
        cancelLabel="Annulla"
        danger={true}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}

// ============================================================
// SezioneAiuto — link a guida HTML utente (CP12 v3.0.0 Step 2).
// ============================================================
//
// Scope CP12 (§22.43 Q-UX.12, §6.192):
//   - Bottone full-width che apre `public/guide.html` in nuova tab.
//   - Path-aware via `import.meta.env.BASE_URL` per allineamento con
//     §6.191 (PWA basename `/pharmatimer/` in build prod GitHub Pages).
//   - PROD-visible (NON gated DEV): la guida è destinata all'utente
//     finale. Posizionata tra SezioneNotifiche e SezioneDati per
//     separazione semantica (aiuto ≠ azione distruttiva).
//
// Deviation §22.43 wording: il prompt originale citava "Avanzate →
// Guida utente"; SezioneAvanzate è gated DEV, quindi inutilizzabile
// come consumer PROD. Risolto con SezioneAiuto dedicata. Vedi §6.192.
//
// Stile: button-like <a> con `target="_blank"` + `rel="noopener
// noreferrer"` (security best practice per link esterni che aprono
// nuova tab — anche se la guida è first-party, il pattern resta
// coerente con il treatment di tab esterne).

function SezioneAiuto() {
  const { tokens: t } = useTheme();
  const guideUrl = `${import.meta.env.BASE_URL}guide.html`;

  return (
    <section className="py-4 mt-4 border-t pt-4" style={{ borderTopColor: t.headerBorder }}>
      <h3 className="text-sm font-medium mb-2">Aiuto</h3>
      <a
        href={guideUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 rounded border w-full max-w-sm text-sm text-center no-underline"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      >
        Guida utente
      </a>
    </section>
  );
}

// ============================================================
// SezioneAvanzate — DEV-only read-only diagnostic panel.
// ============================================================
//
// Scope CP6 Sessione 8a (AMB-8a.D). Visibility gate lives in the wrapper
// (`import.meta.env.DEV && <SezioneAvanzate />`) so the component can
// stay oblivious of the environment check and testing just needs
// vi.stubEnv.
//
// Fields (4, read-only):
//   - Schema DB         : db.verno            (Dexie version)
//   - Ora simulata      : state.simulatedNow  (HH:MM string or "(reale)")
//   - Seed caricato     : selectImpostazione(state, 'seed_loaded')
//   - Notifiche pendenti: services.notifications.getPendingCount()
//                         (CP5 Q-CP5.3, snapshot at mount; defensive
//                          fallback 0 when services not in test stub
//                          context — see renderHelpers.jsx)
//
// data-testid="sezione-avanzate" for the 2 CP6 tests (DEV visible /
// PROD hidden); individual field testids not needed at this depth
// (label match is enough and more resilient to copy changes).

function SezioneAvanzate() {
  const { state, services } = useAppContext();
  const { tokens: t } = useTheme();
  const seedLoaded = selectImpostazione(state, 'seed_loaded');
  const simNow = state.simulatedNow ?? '(reale)';
  const [pendingCount, setPendingCount] = useState(0);

  // Snapshot at mount; non-reactive (no refresh button — CP browser
  // validates the count manually via __pt.notifications.getPendingCount()
  // from DevTools Console). services?.notifications safe-navigation handles
  // the test-stub context where services is not provided.
  useEffect(() => {
    const getCount = services?.notifications?.getPendingCount;
    if (typeof getCount === 'function') {
      try {
        setPendingCount(getCount() ?? 0);
      } catch {
        setPendingCount(0);
      }
    }
  }, [services]);

  return (
    <fieldset
      data-testid="sezione-avanzate"
      className="py-4 mt-4 border-t pt-4"
      style={{ borderTopColor: t.headerBorder }}
    >
      <legend className="text-sm font-medium mb-2">Avanzate</legend>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt>Schema DB</dt>
        <dd>{db.verno}</dd>
        <dt>Ora simulata</dt>
        <dd>{simNow}</dd>
        <dt>Seed caricato</dt>
        <dd>{seedLoaded === 1 ? 'sì' : 'no'}</dd>
        <dt>Notifiche pendenti</dt>
        <dd>{pendingCount}</dd>
      </dl>
    </fieldset>
  );
}

// ============================================================
// SezioneInfo — branding e versione (visibile in PROD).
// ============================================================
//
// Scope closure Z v2.8.0 (§22.37 decision 8 + §6.162 deviation).
//   - Versione PharmaTimer 2.8.0 (synced con package.json post-bump P2.C)
//     + credit "by timegates" in <em> (italic) con middle dot.
//   - Posizionamento: ultimo, dopo SezioneAvanzate (DEV-only) e
//     SezioneNotifiche (PROD).
//   - Visibilita: PROD + DEV (sempre presente, a differenza di
//     Avanzate gated import.meta.env.DEV).
//   - Stile: text-xs + opacity 0.6 su t.textPrimary, separatore border-t
//     con t.headerBorder (stesso pattern visivo SezioneAvanzate).

function SezioneInfo() {
  const { tokens: t } = useTheme();
  const guideUrl = `${import.meta.env.BASE_URL}guide.html`;
  return (
    <section
      data-testid="sezione-info"
      className="py-4 mt-4 border-t pt-4 text-center"
      style={{ borderTopColor: t.headerBorder }}
    >
      <p className="text-xs" style={{ color: t.textPrimary, opacity: 0.6 }}>
        PharmaTimer 2.8.0 · <em className="italic">by timegates</em> ·{' '}
        <a
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: t.textPrimary, textDecoration: 'underline' }}
        >
          Guida
        </a>
      </p>
    </section>
  );
}

export default function ImpostazioniTab(props) {
  // Wrapper-level dirty flag. CP7 Sessione 8a introduces optional
  // external dirty/setDirty props (lifted to ConfigView for cross-tab
  // unsaved-changes guard via UnsavedChangesModal). When both props
  // are absent the component falls back to local state — standalone
  // mounting and all existing tests keep working unchanged.
  const [localDirty, setLocalDirty] = useState(false);
  const dirty = props?.dirty ?? localDirty;
  const setDirty = props?.setDirty ?? setLocalDirty;

  return (
    <section data-testid="config-tab-impostazioni" className="p-4">
      <h2 className="text-xl font-semibold mb-2">Impostazioni</h2>
      <SezioneNome dirty={dirty} setDirty={setDirty} />
      <SezioneTema />
      <SezioneNotifiche />
      <SezioneAiuto />
      <SezioneDati />
      {import.meta.env.DEV && <SezioneAvanzate />}
      <SezioneInfo />
    </section>
  );
}
