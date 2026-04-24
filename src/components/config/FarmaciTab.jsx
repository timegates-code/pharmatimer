// ============================================================
// FarmaciTab — CP5 Sessione 8c-2 (thunks CRUD + delete + data_fine-past).
// ============================================================
//
// CP5 extends CP4 with:
//   - actions.addFarmaco / updateFarmaco / deleteFarmaco wiring
//     via useAppContext (pessimistic thunks, §6.93 refetch orari).
//   - "Elimina" button in drawer footer (edit mode only, danger).
//   - ConfirmModal shared for delete (copy §6.67) and data_fine-past
//     pre-save interceptor (copy §6.68). §6.89 consumed.
//   - handleSalva normalises the form payload, routes through the
//     data_fine-past check when applicable, and delegates to
//     add/update thunks.
//
// Deviations consumed by this file:
//   §6.88 (CP3)      — campo attivo OMESSO dal form.
//   §6.91 (CP2)      — badge Temporaneo t.orange vs amber letterale.
//   §6.89 (CP5)      — ConfirmModal shared promozione 2° consumer.
//   §6.92 (CP5)      — ConfirmModal shared mounts useModalA11y
//                      (asymmetric with ConfirmDeleteProfiloModal,
//                      retrofit target 8d).
//   §6.93 (CP5)      — thunks farmaci also dispatch SET_ORARI
//                      (orari refetch needed for rebuildPlan coherence).
// ============================================================

import { useId, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { selectFarmaci } from '../../state/selectors.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';
import { computeOraPrevista } from '../../domain/planBuilder.js';
import ConfirmModal from '../shared/ConfirmModal.jsx';

// ------------------------------------------------------------
// Enums + defaults.
// ------------------------------------------------------------

const RELAZIONE_PASTO_OPTIONS = [
  { value: 'prima',         label: 'Prima del pasto' },
  { value: 'durante',       label: 'Durante il pasto' },
  { value: 'dopo',          label: 'Dopo il pasto' },
  { value: 'stomaco_pieno', label: 'A stomaco pieno' },
  { value: 'lontano',       label: 'Lontano dai pasti' },
  { value: 'indifferente',  label: 'Indifferente' },
];

const ANCORA_OPTIONS = [
  { value: 'sveglia',   label: 'Sveglia' },
  { value: 'colazione', label: 'Colazione' },
  { value: 'pranzo',    label: 'Pranzo' },
  { value: 'cena',      label: 'Cena' },
  { value: 'sonno',     label: 'Sonno' },
  { value: 'assoluto',  label: 'Orario assoluto' },
];

function makeDefaultOrario(doseNumero) {
  return {
    dose_numero: doseNumero,
    offset_minuti: 0,
    ancora_riferimento: 'colazione',
    descrizione_momento: '',
  };
}

const EMPTY_FORM = {
  nome: '',
  principio_attivo: '',
  funzione: '',
  tipo_frequenza: '',
  intervallo_ore: '',
  intervallo_minimo_ore: '',
  custom_minimo: false,
  dosi_giornaliere: '1',
  relazione_pasto: '',
  dettaglio_pasto: '',
  note: '',
  data_inizio: todayIso(),
  data_fine: '',
  orari: [makeDefaultOrario(1)],
};

function todayIso() {
  const d = new Date();
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ============================================================
// FarmaciTab — root component.
// ============================================================

export default function FarmaciTab(props) {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const farmaci = selectFarmaci(state);

  // Dirty lifted via useUnsavedChanges hook (CP4 AMB-8c.I).
  // Parent setDirty (from ConfigView) is wired via `onChange`.
  // eslint-disable-next-line no-unused-vars
  const [_isDirty, setDirty] = useUnsavedChanges({ onChange: props?.setDirty });

  // Drawer state: null = closed; { mode: 'create' } | { mode: 'edit', id }.
  const [drawer, setDrawer] = useState(null);

  // Ref to the button that opened the drawer (focus restore via useModalA11y).
  const openerRef = useRef(null);

  const sortedFarmaci = useMemo(
    () => [...farmaci].sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    [farmaci],
  );

  function openCreate(e) {
    openerRef.current = e?.currentTarget ?? null;
    setDrawer({ mode: 'create' });
  }
  function openEdit(id, e) {
    openerRef.current = e?.currentTarget ?? null;
    setDrawer({ mode: 'edit', id });
  }
  function closeDrawer() {
    setDirty(false);
    setDrawer(null);
  }

  return (
    <section
      data-testid="config-tab-farmaci"
      className="p-4"
      style={{ color: t.textPrimary }}
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Farmaci</h2>
        <button
          type="button"
          onClick={openCreate}
          aria-label="Nuovo farmaco"
          className="px-3 py-1.5 rounded-md text-sm font-medium"
          style={{
            background: t.modalBg,
            color: t.textPrimary,
            border: `1px solid ${t.tapBd}`,
          }}
        >
          + Nuovo
        </button>
      </header>

      {sortedFarmaci.length === 0 ? (
        <p className="text-sm" style={{ color: t.textSecondary }}>
          Nessun farmaco configurato.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 list-none p-0" role="list">
          {sortedFarmaci.map((farmaco) => (
            <FarmacoCard
              key={farmaco.id}
              farmaco={farmaco}
              theme={t}
              onOpen={openEdit}
            />
          ))}
        </ul>
      )}

      {drawer !== null && (
        <FarmacoDrawer
          mode={drawer.mode}
          editingId={drawer.mode === 'edit' ? drawer.id : null}
          allFarmaci={farmaci}
          onClose={closeDrawer}
          setDirty={setDirty}
          triggerRef={openerRef}
          theme={t}
        />
      )}
    </section>
  );
}

// ============================================================
// FarmacoCard — compact card (unchanged since CP2).
// ============================================================

function FarmacoCard({ farmaco, theme: t, onOpen }) {
  const cronico = farmaco.data_fine === null || farmaco.data_fine === undefined;
  const accent = cronico ? t.green : t.orange;
  const badgeLabel = cronico ? 'Cronico' : 'Temporaneo';
  const isIntervallo = farmaco.tipo_frequenza === 'intervallo';

  return (
    <li
      data-testid={`farmaco-card-${farmaco.id}`}
      className="rounded-lg border flex items-stretch"
      style={{
        background: t.modalBg,
        borderColor: t.tapBd,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <button
        type="button"
        onClick={(e) => onOpen(farmaco.id, e)}
        className="flex-1 text-left p-3"
        style={{ background: 'transparent', color: t.textPrimary }}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="text-base font-semibold truncate"
            style={{ color: t.textPrimary }}
          >
            {farmaco.nome}
          </h3>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `${accent}22`,
              color: accent,
              border: `1px solid ${accent}`,
            }}
          >
            {badgeLabel}
          </span>
        </div>
        {farmaco.funzione && (
          <p
            className="text-sm italic mb-1 truncate"
            style={{ color: t.textSecondary }}
          >
            {farmaco.funzione}
          </p>
        )}
        <p
          className="text-xs font-mono tabular-nums"
          style={{ color: t.textSecondary }}
        >
          {farmaco.dosi_giornaliere}×/die
          {isIntervallo && farmaco.intervallo_ore != null && (
            <span> · ogni {farmaco.intervallo_ore}h</span>
          )}
        </p>
      </button>
    </li>
  );
}

// ============================================================
// FarmacoDrawer — CP4 (AMB-8c.B–I + §6.86 modal-first).
// ============================================================

function FarmacoDrawer({
  mode, editingId, allFarmaci, onClose, setDirty, triggerRef, theme: t,
}) {
  const { state, actions } = useAppContext();
  const titleId = useId();

  // Active profilo for ora_prevista preview + order warning.
  // Defensive derive: state.profiloAttivo may be id-or-object depending
  // on the reducer contract; fall back to attivo=1 filtering.
  const profiloAttivo = useMemo(() => {
    const direct = state.profiloAttivo;
    if (direct && typeof direct === 'object' && direct.ora_colazione) return direct;
    const fromList = (state.profili || []).find((p) => p.attivo === 1);
    return fromList || (state.profili || [])[0] || null;
  }, [state.profiloAttivo, state.profili]);

  // Initial snapshot at mount (drawer remounts on open).
  const initial = useMemo(() => {
    if (mode === 'edit' && editingId != null) {
      const f = allFarmaci.find((x) => x.id === editingId);
      if (f) {
        const filtered = (state.orari || [])
          .filter((o) => o.farmaco_id === editingId)
          .sort((a, b) => a.dose_numero - b.dose_numero)
          .map((o) => ({
            dose_numero: o.dose_numero,
            offset_minuti: o.offset_minuti ?? 0,
            ancora_riferimento: o.ancora_riferimento ?? 'colazione',
            descrizione_momento: o.descrizione_momento ?? '',
          }));
        // Prefer rehydrated count if state diverges from farmaco.dosi_giornaliere
        // (runtime inconsistency will self-heal on next user edit of dosi).
        const orariInit = filtered.length > 0
          ? filtered
          : [makeDefaultOrario(1)];
        const dosi = filtered.length > 0
          ? String(filtered.length)
          : (f.dosi_giornaliere != null ? String(f.dosi_giornaliere) : '1');
        return {
          nome: f.nome ?? '',
          principio_attivo: f.principio_attivo ?? '',
          funzione: f.funzione ?? '',
          tipo_frequenza: f.tipo_frequenza ?? '',
          intervallo_ore: f.intervallo_ore != null ? String(f.intervallo_ore) : '',
          intervallo_minimo_ore: f.intervallo_minimo_ore != null ? String(f.intervallo_minimo_ore) : '',
          custom_minimo: f.intervallo_minimo_ore != null,
          dosi_giornaliere: dosi,
          relazione_pasto: f.relazione_pasto ?? '',
          dettaglio_pasto: f.dettaglio_pasto ?? '',
          note: f.note ?? '',
          data_inizio: f.data_inizio ?? todayIso(),
          data_fine: f.data_fine ?? '',
          orari: orariInit,
        };
      }
    }
    return { ...EMPTY_FORM, orari: [makeDefaultOrario(1)] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(initial);

  // Undo banner state (trim feedback).
  const [removedOrari, setRemovedOrari] = useState([]);

  function updateField(name, value) {
    setForm((f) => {
      const next = { ...f, [name]: value };

      // Sync orari rows when dosi_giornaliere changes (AMB-8c.C).
      if (name === 'dosi_giornaliere') {
        const desired = Math.max(1, Number(value) || 1);
        const current = f.orari.length;
        if (desired > current) {
          // Add rows with defaults; clears any pending undo banner.
          const added = [];
          for (let i = current + 1; i <= desired; i++) {
            added.push(makeDefaultOrario(i));
          }
          next.orari = [...f.orari, ...added];
          setRemovedOrari([]);
        } else if (desired < current) {
          // Trim last rows; expose undo banner.
          const keep = f.orari.slice(0, desired);
          const dropped = f.orari.slice(desired);
          next.orari = keep;
          setRemovedOrari(dropped);
        } else {
          setRemovedOrari([]);
        }
      }

      return next;
    });
    setDirty(true);
  }

  function updateOrarioField(index, name, value) {
    setForm((f) => {
      const orari = f.orari.map((o, i) => (
        i === index ? { ...o, [name]: value } : o
      ));
      return { ...f, orari };
    });
    setDirty(true);
  }

  function undoTrim() {
    if (!removedOrari.length) return;
    setForm((f) => ({
      ...f,
      dosi_giornaliere: String(f.orari.length + removedOrari.length),
      orari: [...f.orari, ...removedOrari],
    }));
    setRemovedOrari([]);
    setDirty(true);
  }

  function updateTipoFrequenza(value) {
    setForm((f) => ({
      ...f,
      tipo_frequenza: value,
      intervallo_ore: value === 'fisso' ? '' : f.intervallo_ore,
      custom_minimo: value === 'fisso' ? false : f.custom_minimo,
      intervallo_minimo_ore: value === 'fisso' ? '' : f.intervallo_minimo_ore,
    }));
    setDirty(true);
  }

  function toggleCustomMinimo(checked) {
    setForm((f) => ({
      ...f,
      custom_minimo: checked,
      intervallo_minimo_ore: checked ? f.intervallo_minimo_ore : '',
    }));
    setDirty(true);
  }

  function handleAnnulla() {
    setForm(initial);
    setRemovedOrari([]);
    onClose();
  }

  // --- CP5: normalization helpers + thunks wire -----------------

  // Convert the form state (strings/empty-string for empty) into the
  // repo-shape payloads expected by add/updateFarmaco(farmacoData,
  // orari). Pure: no side effects.
  function normalizeForm(f) {
    const trimOrNull = (s) => {
      const v = (s ?? '').trim();
      return v === '' ? null : v;
    };
    const numOrNull = (s) => {
      if (s === '' || s == null) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const tipo = f.tipo_frequenza;
    const farmacoData = {
      nome: (f.nome ?? '').trim(),
      principio_attivo: trimOrNull(f.principio_attivo),
      funzione: trimOrNull(f.funzione),
      tipo_frequenza: tipo,
      intervallo_ore: tipo === 'intervallo' ? numOrNull(f.intervallo_ore) : null,
      intervallo_minimo_ore: (tipo === 'intervallo' && f.custom_minimo)
        ? numOrNull(f.intervallo_minimo_ore)
        : null,
      dosi_giornaliere: numOrNull(f.dosi_giornaliere) ?? 1,
      relazione_pasto: f.relazione_pasto,
      dettaglio_pasto: trimOrNull(f.dettaglio_pasto),
      note: trimOrNull(f.note),
      data_inizio: f.data_inizio || null,
      data_fine: f.data_fine || null,
    };
    const orari = f.orari.map((o) => ({
      dose_numero: Number(o.dose_numero),
      offset_minuti: Number(o.offset_minuti) || 0,
      ancora_riferimento: o.ancora_riferimento,
      descrizione_momento: trimOrNull(o.descrizione_momento),
    }));
    return { farmacoData, orari };
  }

  // ConfirmModal state — 2 independent flows (§6.68 + §6.67).
  //
  // `dataFinePendingPayload` holds the normalised save payload while
  // the user decides on the data_fine-past confirm. On cancel we
  // discard it (drawer stays open, dirty preserved). On confirm we
  // pass it to the appropriate thunk.
  const [dataFineConfirmOpen, setDataFineConfirmOpen] = useState(false);
  const [dataFinePendingPayload, setDataFinePendingPayload] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Submit-lock so rapid taps / Enter chord cannot fire the thunk twice.
  const [submitting, setSubmitting] = useState(false);

  function isoToday() {
    return todayIso();
  }

  async function commitSave({ farmacoData, orari }) {
    setSubmitting(true);
    try {
      const result = mode === 'create'
        ? await actions.addFarmaco(farmacoData, orari)
        : await actions.updateFarmaco(editingId, farmacoData, orari);
      if (result?.ok) {
        onClose();
      }
      // On failure the thunk already dispatched SET_ERROR; the drawer
      // stays open so the user can retry or adjust.
      return result;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSalva() {
    const payload = normalizeForm(form);
    // Data_fine-past interceptor (§6.68). Applies to both create and
    // edit (AMB-8c-2.D): the semantic "dose successive scompariranno"
    // does not distinguish mode.
    if (payload.farmacoData.data_fine && payload.farmacoData.data_fine < isoToday()) {
      setDataFinePendingPayload(payload);
      setDataFineConfirmOpen(true);
      return;
    }
    await commitSave(payload);
  }

  async function confirmDataFine() {
    const payload = dataFinePendingPayload;
    setDataFineConfirmOpen(false);
    setDataFinePendingPayload(null);
    if (payload) await commitSave(payload);
  }

  function cancelDataFine() {
    setDataFineConfirmOpen(false);
    setDataFinePendingPayload(null);
    // Drawer stays open; form dirty preserved.
  }

  async function confirmDelete() {
    if (editingId == null) {
      setDeleteConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const result = await actions.deleteFarmaco(editingId);
      setDeleteConfirmOpen(false);
      if (result?.ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false);
  }

  // --- Validation -----------------------------------------------

  const hasIntervalloOreRequired =
    form.tipo_frequenza !== 'intervallo' ||
    (form.intervallo_ore !== '' && Number(form.intervallo_ore) > 0);

  const allRequiredFilled =
    form.nome.trim().length > 0 &&
    form.tipo_frequenza !== '' &&
    form.dosi_giornaliere !== '' && Number(form.dosi_giornaliere) > 0 &&
    form.relazione_pasto !== '' &&
    form.data_inizio !== '' &&
    hasIntervalloOreRequired;

  const duplicateMatch = useMemo(() => {
    const q = form.nome.trim().toLowerCase();
    if (!q) return null;
    const other = allFarmaci.find((f) => (
      f.id !== editingId &&
      (f.nome ?? '').trim().toLowerCase() === q
    ));
    return other ? other.nome : null;
  }, [form.nome, allFarmaci, editingId]);

  const minimoInvalid =
    form.custom_minimo &&
    form.intervallo_minimo_ore !== '' &&
    form.intervallo_ore !== '' &&
    Number(form.intervallo_minimo_ore) >= Number(form.intervallo_ore);

  // --- Orari preview + soft warning ordine wrap-aware -----------

  const orariPreview = useMemo(() => {
    if (!profiloAttivo) return form.orari.map(() => null);
    return form.orari.map((o) => {
      try {
        return computeOraPrevista(
          {
            dose_numero: o.dose_numero,
            offset_minuti: Number(o.offset_minuti) || 0,
            ancora_riferimento: o.ancora_riferimento,
          },
          profiloAttivo,
        );
      } catch {
        return null;
      }
    });
  }, [form.orari, profiloAttivo]);

  const orariOrderWarning = useMemo(() => {
    const valid = orariPreview.filter((x) => typeof x === 'string' && /^\d{2}:\d{2}$/.test(x));
    if (valid.length < 2) return null;
    const toMin = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const mins = valid.map(toMin);
    let wrapCount = 0;
    for (let i = 1; i < mins.length; i++) {
      if (mins[i] < mins[i - 1]) wrapCount++;
    }
    // 0 wraps = monotonic OK; 1 wrap = mezzanotte crossing OK; 2+ = disordered.
    return wrapCount > 1
      ? 'Ordine orari anomalo: più di un attraversamento di mezzanotte'
      : null;
  }, [orariPreview]);

  const isDirty = useMemo(() => {
    // Shallow compare on all form fields + deep compare on orari array.
    for (const k of Object.keys(EMPTY_FORM)) {
      if (k === 'orari') continue;
      if (form[k] !== initial[k]) return true;
    }
    if (form.orari.length !== initial.orari.length) return true;
    for (let i = 0; i < form.orari.length; i++) {
      const a = form.orari[i];
      const b = initial.orari[i];
      if (!b) return true;
      if (
        a.dose_numero !== b.dose_numero ||
        a.offset_minuti !== b.offset_minuti ||
        a.ancora_riferimento !== b.ancora_riferimento ||
        a.descrizione_momento !== b.descrizione_momento
      ) return true;
    }
    return false;
  }, [form, initial]);

  const canSave =
    (mode === 'create' || isDirty) &&
    allRequiredFilled &&
    !minimoInvalid;

  const { containerRef, modalProps } = useModalA11y({
    isOpen: true,
    onClose: handleAnnulla,
    labelId: titleId,
    triggerRef,
  });

  const isIntervallo = form.tipo_frequenza === 'intervallo';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: t.modalOverlay }}
      onClick={(e) => {
        // §6.86.1/.4: backdrop click closes only when non-dirty.
        if (e.target === e.currentTarget && !isDirty) handleAnnulla();
      }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        data-testid="farmaco-drawer"
        className="w-full max-w-md rounded-t-2xl p-5 pb-8 flex flex-col gap-3 max-h-[92vh] overflow-y-auto"
        style={{ background: t.modalBg }}
      >
        <header className="flex items-center justify-between">
          <h3
            id={titleId}
            className="font-bold text-base"
            style={{ color: t.textPrimary }}
          >
            {mode === 'create'
              ? 'Nuovo farmaco'
              : `Modifica ${initial.nome || 'farmaco'}`}
          </h3>
          <button
            type="button"
            onClick={handleAnnulla}
            aria-label="Chiudi"
            className="px-2 py-0.5 text-xl leading-none rounded"
            style={{ color: t.textSecondary, background: 'transparent' }}
          >
            ×
          </button>
        </header>

        {/* --- Sezione 1: Anagrafica ---------------------------- */}
        <SectionHeading theme={t}>Anagrafica</SectionHeading>

        <FormField
          id="farmaco-nome"
          label="Nome"
          value={form.nome}
          onChange={(v) => updateField('nome', v)}
          type="text"
          theme={t}
          warning={duplicateMatch ? `Nome già usato da «${duplicateMatch}»` : null}
        />
        <FormField
          id="farmaco-principio-attivo"
          label="Principio attivo"
          value={form.principio_attivo}
          onChange={(v) => updateField('principio_attivo', v)}
          type="text"
          theme={t}
        />
        <FormField
          id="farmaco-funzione"
          label="Funzione"
          value={form.funzione}
          onChange={(v) => updateField('funzione', v)}
          type="text"
          theme={t}
        />

        {/* --- Sezione 2: Frequenza & Dosi ---------------------- */}
        <SectionHeading theme={t}>Frequenza & Dosi</SectionHeading>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium" style={{ color: t.textPrimary }}>
            Tipo frequenza
          </legend>
          <div className="flex gap-4 py-1">
            <label className="flex items-center gap-2" style={{ color: t.textPrimary }}>
              <input
                type="radio"
                name="tipo_frequenza"
                value="fisso"
                checked={form.tipo_frequenza === 'fisso'}
                onChange={() => updateTipoFrequenza('fisso')}
              />
              <span>Fisso</span>
            </label>
            <label className="flex items-center gap-2" style={{ color: t.textPrimary }}>
              <input
                type="radio"
                name="tipo_frequenza"
                value="intervallo"
                checked={form.tipo_frequenza === 'intervallo'}
                onChange={() => updateTipoFrequenza('intervallo')}
              />
              <span>A intervallo</span>
            </label>
          </div>
        </fieldset>

        {isIntervallo && (
          <FormField
            id="farmaco-intervallo-ore"
            label="Intervallo (ore)"
            value={form.intervallo_ore}
            onChange={(v) => updateField('intervallo_ore', v)}
            type="number"
            theme={t}
          />
        )}

        {isIntervallo && (
          <FormCheckbox
            id="farmaco-custom-minimo"
            label="Personalizza limite minimo"
            checked={form.custom_minimo}
            onChange={toggleCustomMinimo}
            theme={t}
          />
        )}

        {isIntervallo && form.custom_minimo && (
          <FormField
            id="farmaco-intervallo-minimo-ore"
            label="Limite minimo (ore)"
            value={form.intervallo_minimo_ore}
            onChange={(v) => updateField('intervallo_minimo_ore', v)}
            type="number"
            theme={t}
            warning={
              minimoInvalid
                ? 'Deve essere minore dell\u2019intervallo regolare'
                : null
            }
          />
        )}

        <FormField
          id="farmaco-dosi-giornaliere"
          label="Dosi giornaliere"
          value={form.dosi_giornaliere}
          onChange={(v) => updateField('dosi_giornaliere', v)}
          type="number"
          theme={t}
        />

        {/* --- Sezione 3: Orari di assunzione ------------------- */}
        <SectionHeading theme={t}>Orari di assunzione</SectionHeading>

        {!profiloAttivo && (
          <p
            className="text-xs italic"
            role="status"
            style={{ color: t.textSecondary }}
          >
            Nessun profilo attivo — anteprima ora non disponibile.
          </p>
        )}

        {removedOrari.length > 0 && (
          <div
            role="status"
            className="text-xs rounded p-2 flex items-center justify-between gap-2"
            style={{
              background: `${t.orange}22`,
              color: t.textPrimary,
              border: `1px solid ${t.orange}`,
            }}
          >
            <span>
              {removedOrari.length === 1
                ? '1 orario rimosso'
                : `${removedOrari.length} orari rimossi`}
            </span>
            <button
              type="button"
              onClick={undoTrim}
              className="underline text-xs font-medium"
              style={{ color: t.orange, background: 'transparent' }}
            >
              Ripristina
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {form.orari.map((orario, i) => (
            <OrarioRow
              key={`orario-${i}`}
              index={i}
              orario={orario}
              oraPreview={orariPreview[i]}
              onChange={(name, value) => updateOrarioField(i, name, value)}
              theme={t}
            />
          ))}
        </div>

        {orariOrderWarning && (
          <p
            className="text-xs"
            role="status"
            style={{ color: t.orange }}
          >
            {orariOrderWarning}
          </p>
        )}

        {/* --- Sezione 4: Avanzate ------------------------------ */}
        {/* §6.88 — campo `attivo` OMESSO dal form. Soft-delete
            (§6.67) diventa unico canale user-level di
            disattivazione. Schema DB invariato: il flag resta
            per infrastruttura filtering (GET_FARMACI_SOLO_ATTIVI). */}
        <SectionHeading theme={t}>Avanzate</SectionHeading>

        <FormSelect
          id="farmaco-relazione-pasto"
          label="Relazione con il pasto"
          value={form.relazione_pasto}
          onChange={(v) => updateField('relazione_pasto', v)}
          options={RELAZIONE_PASTO_OPTIONS}
          theme={t}
        />
        <FormField
          id="farmaco-dettaglio-pasto"
          label="Dettaglio pasto"
          value={form.dettaglio_pasto}
          onChange={(v) => updateField('dettaglio_pasto', v)}
          type="text"
          theme={t}
        />
        <FormTextarea
          id="farmaco-note"
          label="Note"
          value={form.note}
          onChange={(v) => updateField('note', v)}
          theme={t}
        />
        <FormField
          id="farmaco-data-inizio"
          label="Data inizio"
          value={form.data_inizio}
          onChange={(v) => updateField('data_inizio', v)}
          type="date"
          theme={t}
        />
        <FormField
          id="farmaco-data-fine"
          label="Data fine"
          value={form.data_fine}
          onChange={(v) => updateField('data_fine', v)}
          type="date"
          theme={t}
        />

        <footer className="flex flex-col gap-2 mt-4">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
              style={{
                background: t.modalBg,
                color: t.red,
                borderColor: t.red,
              }}
            >
              Elimina
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAnnulla}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
              style={{
                background: t.modalBg,
                color: t.textPrimary,
                borderColor: t.tapBd,
              }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSalva}
              disabled={!canSave || submitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: t.blue, color: '#fff' }}
            >
              Salva
            </button>
          </div>
        </footer>
      </div>

      {/* --- ConfirmModal: data_fine nel passato (§6.68) ------------ */}
      <ConfirmModal
        open={dataFineConfirmOpen}
        title="Data fine nel passato"
        body={
          <p>
            Impostando la data fine a{' '}
            <strong>{dataFinePendingPayload?.farmacoData?.data_fine ?? ''}</strong>,
            le dosi successive a quella data scompariranno dalla vista Oggi.
            I log storici saranno preservati.
          </p>
        }
        confirmLabel="Conferma"
        cancelLabel="Annulla"
        onConfirm={confirmDataFine}
        onCancel={cancelDataFine}
      />

      {/* --- ConfirmModal: delete soft (§6.67) ---------------------- */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Elimina farmaco?"
        body={
          <p>
            Sei sicuro di voler eliminare{' '}
            <strong>{initial.nome || 'questo farmaco'}</strong>?
            Le eventuali dosi già registrate oggi scompariranno dalla vista Oggi;
            il log storico sarà preservato per consultazione futura.
          </p>
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        danger={true}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

// ============================================================
// OrarioRow — single dose timing row (CP4 AMB-8c.C).
// ============================================================

function OrarioRow({ index, orario, oraPreview, onChange, theme: t }) {
  const ancoraId = `orario-ancora-${index}`;
  const offsetId = `orario-offset-${index}`;
  const descrId  = `orario-descr-${index}`;

  return (
    <div
      data-testid={`orario-row-${index}`}
      className="rounded border p-3 flex flex-col gap-2"
      style={{ background: t.modalBg, borderColor: t.tapBd }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-mono uppercase tracking-wider"
          style={{ color: t.textSecondary }}
        >
          Dose #{index + 1}
        </span>
        {oraPreview && (
          <span
            className="text-sm font-mono tabular-nums"
            style={{ color: t.textPrimary }}
          >
            {oraPreview}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={ancoraId}
            className="text-xs font-medium"
            style={{ color: t.textPrimary }}
          >
            Ancora
          </label>
          <select
            id={ancoraId}
            value={orario.ancora_riferimento}
            onChange={(e) => onChange('ancora_riferimento', e.target.value)}
            className="rounded px-2 py-1.5 border text-sm"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          >
            {ANCORA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={offsetId}
            className="text-xs font-medium"
            style={{ color: t.textPrimary }}
          >
            Offset (min)
          </label>
          <input
            id={offsetId}
            type="number"
            value={orario.offset_minuti}
            onChange={(e) => onChange('offset_minuti', e.target.value)}
            className="rounded px-2 py-1.5 border text-sm tabular-nums"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={descrId}
          className="text-xs font-medium"
          style={{ color: t.textPrimary }}
        >
          Descrizione (opz.)
        </label>
        <input
          id={descrId}
          type="text"
          value={orario.descrizione_momento || ''}
          onChange={(e) => onChange('descrizione_momento', e.target.value)}
          className="rounded px-2 py-1.5 border text-sm"
          style={{
            background: t.modalBg,
            color: t.textPrimary,
            borderColor: t.tapBd,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Internal form helpers (inline — promozione shared 8d candidata).
// ============================================================

function SectionHeading({ children, theme: t }) {
  return (
    <h4
      className="sticky top-0 -mx-5 px-5 py-2 mt-2 text-sm font-bold z-10"
      style={{
        background: t.modalBg,
        color: t.textPrimary,
        borderBottom: `1px solid ${t.tapBd}`,
      }}
    >
      {children}
    </h4>
  );
}

function FormField({ id, label, value, onChange, type, theme: t, warning }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded px-3 py-2 border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
      {warning && (
        <p className="text-xs" role="status" style={{ color: t.red }}>
          {warning}
        </p>
      )}
    </div>
  );
}

function FormSelect({ id, label, value, onChange, options, theme: t }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded px-3 py-2 border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      >
        <option value="" disabled>— seleziona —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({ id, label, value, onChange, theme: t }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="rounded px-3 py-2 border resize-y"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
    </div>
  );
}

function FormCheckbox({ id, label, checked, onChange, theme: t }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm"
      style={{ color: t.textPrimary }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
