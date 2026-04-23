import { useState, useEffect } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { selectImpostazione } from '../../state/selectors.js';
import { db } from '../../data/db.js';
import { useTheme } from '../../hooks/useTheme.js';

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
// SezioneAvanzate — DEV-only read-only diagnostic panel.
// ============================================================
//
// Scope CP6 Sessione 8a (AMB-8a.D). Visibility gate lives in the wrapper
// (`import.meta.env.DEV && <SezioneAvanzate />`) so the component can
// stay oblivious of the environment check and testing just needs
// vi.stubEnv.
//
// Fields (3, read-only):
//   - Schema DB    : db.verno            (Dexie version, 1 on the
//                                          current schema)
//   - Ora simulata : state.simulatedNow  (HH:MM string or "(reale)"
//                                          fallback when null)
//   - Seed caricato: selectImpostazione(state, 'seed_loaded')
//                    (Gate CP0 Esito A — marker 1 means seed applied,
//                    null/absent means fresh install pre-seed; in DEV
//                    this is useful to confirm fixtures are in place.)
//
// data-testid="sezione-avanzate" for the 2 CP6 tests (DEV visible /
// PROD hidden); individual field testids not needed at this depth
// (label match is enough and more resilient to copy changes).

function SezioneAvanzate() {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const seedLoaded = selectImpostazione(state, 'seed_loaded');
  const simNow = state.simulatedNow ?? '(reale)';

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
      </dl>
    </fieldset>
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
      {import.meta.env.DEV && <SezioneAvanzate />}
    </section>
  );
}
