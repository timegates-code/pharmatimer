// ============================================================
// FarmaciTab — CP8 v3.0.0 Step 2 (UI giorni+ore extended branch).
// ============================================================
//
// CP5 (Sessione 8c-2 baseline) extended CP4 with:
//   - actions.addFarmaco / updateFarmaco / deleteFarmaco wiring
//     via useAppContext (pessimistic thunks, §6.93 refetch orari).
//   - "Elimina" button in drawer footer (edit mode only, danger).
//   - ConfirmModal shared for delete (copy §6.67) and data_fine-past
//     pre-save interceptor (copy §6.68). §6.89 consumed.
//   - handleSalva normalises the form payload, routes through the
//     data_fine-past check when applicable, and delegates to
//     add/update thunks.
//
// CP5 v3.0.0 Step 1 layer (§6.176-179):
//   - §6.178: `EMPTY_FORM.data_inizio` default flipped from
//     `todayIso()` to `tomorrowIso()` (Q-UX.4 Mit-A preview garantito
//     out-of-the-box, Q-S6=a). Validation `>= today` added but
//     **mode-gated** (`mode === 'edit' || form.data_inizio >= todayIso()`)
//     to preserve editing of legacy farmaci with past data_inizio
//     — without this gate, editing a farmaco started 6 months ago
//     would disable Salva (regressione UX inaccettabile).
//   - §6.177: post-save Mit-C toast trigger in commitSave (caller-
//     side, only mode === 'create'). Computes ora_prevista from
//     orariPreview[0] (already in scope) and dispatches
//     actions.showToast with formatPrimaDose-formatted message.
//
// CP8 v3.0.0 Step 2 layer (§6.183-185):
//   - §6.183: form-state internal split intervallo into
//     `intervallo_giorni` (0..365 step 1) + `intervallo_ore_residue`
//     (0..23.5 step 0.5). DB column `intervallo_ore` rebuilt at
//     normalize-time as giorni*24 + ore_residue. Single source of
//     truth on disk preserved (§22.42 EXT.3' Q1=b).
//   - §6.184: `dosi_giornaliere` auto-locked to '1' (readonly) when
//     form is extended (giorni*24 + ore_residue > 24 strict).
//     Re-editable when user reverts under threshold (§22.42 EXT.2).
//   - §6.185: cascade ConfirmModal (4° consumer of shared, post-
//     §6.180 ImpostazioniTab promoted 3°; §11.G nominazione "3°"
//     superata by §22.44 timeline). Triggered at handleSalva when
//     form is extended AND form.orari.length > 1: warns about N-1
//     orari rows being trimmed. On confirm proceeds through normal
//     data_fine-past interceptor chain (§22.42 EXT.2.a).
//   - micro: `formatFrequencyLabel` in FarmacoCard renders "ogni
//     7 giorni" / "ogni 1g 6h" instead of "ogni 168h" / "ogni 30h"
//     for extended intervals (UX-readable for v3.0.0 novices).
//
// CP9 v3.0.0 Step 2 layer (§6.187):
//   - §6.187: gap recovery affordance hidden for extended-frequency
//     farmaci. Two effects in this file:
//       (a) JSX gate `!isExtendedForm` on the `custom_minimo` checkbox
//           and `intervallo_minimo_ore` field — they have no semantic
//           meaning for intervalli > 24h (§22.42 EXT.4 ratified).
//       (b) `updateField` cleanup: when transitioning into extended
//           state, clear `custom_minimo` and `intervallo_minimo_ore`
//           form fields. Prevents ghost values leaking via normalizeForm
//           if user later reverts back under 24h.
//     Pairs with `recalc.js` gate (gap_recovery prompt suppressed) +
//     `DoseCard.jsx` gate (gap badge hidden).
//
// Deviations consumed by this file:
//   §6.88 (CP3)      — campo attivo OMESSO dal form.
//   §6.91 (CP2)      — badge Temporaneo t.orange vs amber letterale.
//   §6.89 (CP5)      — ConfirmModal shared promozione 2° consumer.
//   §6.92 (CP5)      — ConfirmModal shared mounts useModalA11y.
//   §6.93 (CP5)      — thunks farmaci also dispatch SET_ORARI.
//   §6.177 (CP5 v3)  — Mit-C trigger caller-side.
//   §6.178 (CP5 v3)  — data_inizio default tomorrow + validation
//                      mode-gated.
//   §6.183 (CP8 v3)  — form-state intervallo split giorni+ore.
//   §6.184 (CP8 v3)  — dosi_giornaliere auto-locked extended.
//   §6.185 (CP8 v3)  — cascade ConfirmModal 4° consumer + sequencing.
//   §6.187 (CP9 v3)  — gate UI custom_minimo + cleanup form-state extended.
// ============================================================

import { useId, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { selectFarmaci } from '../../state/selectors.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges.js';
import { computeOraPrevista } from '../../domain/planBuilder.js';
import { formatPrimaDose } from '../../utils/copy.js';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import UnsavedChangesModal from './UnsavedChangesModal.jsx';

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

// CP8 §6.183: extended threshold strict > 24h (§22.42 EXT.3' Q2=a).
const EXTENDED_THRESHOLD_HOURS = 24;
const GIORNI_MAX = 365;
const ORE_RESIDUE_MAX = 23.5;
const ORE_RESIDUE_STEP = 0.5;

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
  // CP8 §6.183: split intervallo in giorni + ore residue (form-only).
  // Persisted in DB as giorni*24 + ore_residue via normalizeForm.
  intervallo_giorni: '',
  intervallo_ore_residue: '',
  intervallo_minimo_ore: '',
  custom_minimo: false,
  dosi_giornaliere: '1',
  relazione_pasto: '',
  dettaglio_pasto: '',
  note: '',
  data_inizio: tomorrowIso(),
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

function tomorrowIso() {
  const d = new Date(Date.now() + 86400000);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ------------------------------------------------------------
// Intervallo conversion helpers (CP8 §6.183).
// ------------------------------------------------------------

/**
 * Split a DB `intervallo_ore` (number, hours, may be decimal) into
 * { giorni, ore_residue } for form display. Inverse of
 * `joinIntervalloHours`.
 *
 * Round-trip safe: join(split(x)) === x for any non-negative finite x.
 */
function splitIntervalloHours(totalHours) {
  if (totalHours == null || !Number.isFinite(totalHours)) {
    return { giorni: 0, ore_residue: 0 };
  }
  const giorni = Math.floor(totalHours / 24);
  // Round residue to 1 decimal to absorb FP error from subtraction.
  const ore_residue = Math.round((totalHours - giorni * 24) * 10) / 10;
  return { giorni, ore_residue };
}

function joinIntervalloHours(giorni, oreResidue) {
  const g = Number.isFinite(giorni) ? giorni : 0;
  const o = Number.isFinite(oreResidue) ? oreResidue : 0;
  // Round to 1 decimal to match DECIMAL(4,1) DB column.
  return Math.round((g * 24 + o) * 10) / 10;
}

/**
 * Whether the current form represents an extended-frequency drug.
 * Strict: intervallo_ore_total > 24, tipo_frequenza === 'intervallo'.
 *
 * Both intervallo_giorni and intervallo_ore_residue may be empty
 * strings while user is typing — treated as 0 for the threshold check.
 */
function isExtendedFromForm(form) {
  if (form.tipo_frequenza !== 'intervallo') return false;
  const g = form.intervallo_giorni === '' ? 0 : Number(form.intervallo_giorni);
  const o = form.intervallo_ore_residue === '' ? 0 : Number(form.intervallo_ore_residue);
  if (!Number.isFinite(g) || !Number.isFinite(o)) return false;
  return joinIntervalloHours(g, o) > EXTENDED_THRESHOLD_HOURS;
}

/**
 * Render a human-readable frequency label for FarmacoCard.
 * (CP8 micro-extension: replaces "ogni 168h" with "ogni 7 giorni".)
 */
function formatFrequencyLabel(intervalloOre) {
  if (intervalloOre == null) return null;
  if (intervalloOre <= EXTENDED_THRESHOLD_HOURS) return `ogni ${intervalloOre}h`;
  const giorni = Math.floor(intervalloOre / 24);
  const ore = Math.round((intervalloOre - giorni * 24) * 10) / 10;
  if (ore === 0) return giorni === 1 ? 'ogni giorno' : `ogni ${giorni} giorni`;
  return `ogni ${giorni}g ${ore}h`;
}

// ============================================================
// FarmaciTab — root component.
// ============================================================

export default function FarmaciTab(props) {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const farmaci = selectFarmaci(state);

  // eslint-disable-next-line no-unused-vars
  const [_isDirty, setDirty] = useUnsavedChanges({ onChange: props?.setDirty });

  const [drawer, setDrawer] = useState(null);
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
// FarmacoCard — compact card.
// CP8: uses formatFrequencyLabel for human-readable extended copy.
// ============================================================

function FarmacoCard({ farmaco, theme: t, onOpen }) {
  const cronico = farmaco.data_fine === null || farmaco.data_fine === undefined;
  const accent = cronico ? t.green : t.orange;
  const badgeLabel = cronico ? 'Cronico' : 'Temporaneo';
  const isIntervallo = farmaco.tipo_frequenza === 'intervallo';
  const frequencyLabel = isIntervallo ? formatFrequencyLabel(farmaco.intervallo_ore) : null;

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
          {frequencyLabel && (
            <span> · {frequencyLabel}</span>
          )}
        </p>
      </button>
    </li>
  );
}

// ============================================================
// FarmacoDrawer — CP4-CP5-CP8.
// ============================================================

function FarmacoDrawer({
  mode, editingId, allFarmaci, onClose, setDirty, triggerRef, theme: t,
}) {
  const { state, actions } = useAppContext();
  const titleId = useId();

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
        const orariInit = filtered.length > 0
          ? filtered
          : [makeDefaultOrario(1)];
        const dosi = filtered.length > 0
          ? String(filtered.length)
          : (f.dosi_giornaliere != null ? String(f.dosi_giornaliere) : '1');
        // CP8 §6.183: split intervallo_ore (DB) into giorni + ore_residue (form).
        const split = f.intervallo_ore != null
          ? splitIntervalloHours(Number(f.intervallo_ore))
          : { giorni: 0, ore_residue: 0 };
        const intervalloGiorniStr = f.intervallo_ore != null ? String(split.giorni) : '';
        const intervalloOreResStr = f.intervallo_ore != null ? String(split.ore_residue) : '';
        return {
          nome: f.nome ?? '',
          principio_attivo: f.principio_attivo ?? '',
          funzione: f.funzione ?? '',
          tipo_frequenza: f.tipo_frequenza ?? '',
          intervallo_giorni: intervalloGiorniStr,
          intervallo_ore_residue: intervalloOreResStr,
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
    return { ...EMPTY_FORM, data_inizio: tomorrowIso(), orari: [makeDefaultOrario(1)] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(initial);
  const [removedOrari, setRemovedOrari] = useState([]);

  // CP8 §6.184: derive isExtendedForm live; used to lock dosi_giornaliere
  // and to gate the cascade ConfirmModal at save-time.
  const isExtendedForm = useMemo(() => isExtendedFromForm(form), [form]);

  function updateField(name, value) {
    setForm((f) => {
      let next = { ...f, [name]: value };

      // CP8 §6.184: when a change pushes form into extended state,
      // auto-lock dosi_giornaliere to '1' (UI-only; orari trim
      // deferred to cascade ConfirmModal at save-time, §6.185).
      // Consider both intervallo edits AND tipo_frequenza change
      // since both can flip the extended boundary.
      if (
        name === 'intervallo_giorni' ||
        name === 'intervallo_ore_residue' ||
        name === 'tipo_frequenza'
      ) {
        if (isExtendedFromForm(next)) {
          if (next.dosi_giornaliere !== '1') {
            next = { ...next, dosi_giornaliere: '1' };
          }
          // CP9 §6.187 EXT.4: extended branch has no gap recovery, so
          // custom_minimo / intervallo_minimo_ore fields are hidden in UI.
          // Cleanup form state to avoid ghost values that could leak via
          // normalizeForm when user toggles back to standard later.
          if (next.custom_minimo || next.intervallo_minimo_ore !== '') {
            next = { ...next, custom_minimo: false, intervallo_minimo_ore: '' };
          }
        }
      }

      // Sync orari rows when dosi_giornaliere changes (AMB-8c.C).
      // Skip when extended (dosi locked at 1, no sync needed).
      if (name === 'dosi_giornaliere' && !isExtendedFromForm(next)) {
        const desired = Math.max(1, Number(value) || 1);
        const current = f.orari.length;
        if (desired > current) {
          const added = [];
          for (let i = current + 1; i <= desired; i++) {
            added.push(makeDefaultOrario(i));
          }
          next.orari = [...f.orari, ...added];
          setRemovedOrari([]);
        } else if (desired < current) {
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
    setForm((f) => {
      const next = {
        ...f,
        tipo_frequenza: value,
        intervallo_giorni: value === 'fisso' ? '' : f.intervallo_giorni,
        intervallo_ore_residue: value === 'fisso' ? '' : f.intervallo_ore_residue,
        custom_minimo: value === 'fisso' ? false : f.custom_minimo,
        intervallo_minimo_ore: value === 'fisso' ? '' : f.intervallo_minimo_ore,
      };
      // If switching to fisso, also unlock dosi (no longer extended).
      // If switching to intervallo with previously-set extended values,
      // re-evaluate isExtended on next render (covered by useMemo).
      return next;
    });
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

  function doAnnulla() {
    setForm(initial);
    setRemovedOrari([]);
    onClose();
  }

  function handleAnnulla() {
    if (isDirty) {
      setUnsavedConfirmOpen(true);
      return;
    }
    doAnnulla();
  }

  // --- CP5: normalization helpers + thunks wire -----------------

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
    // CP8 §6.183: rebuild DB column intervallo_ore from form split.
    let intervalloOre = null;
    if (tipo === 'intervallo') {
      const g = numOrNull(f.intervallo_giorni);
      const o = numOrNull(f.intervallo_ore_residue);
      if (g != null || o != null) {
        intervalloOre = joinIntervalloHours(g ?? 0, o ?? 0);
        if (intervalloOre === 0) intervalloOre = null;
      }
    }
    const farmacoData = {
      nome: (f.nome ?? '').trim(),
      principio_attivo: trimOrNull(f.principio_attivo),
      funzione: trimOrNull(f.funzione),
      tipo_frequenza: tipo,
      intervallo_ore: intervalloOre,
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

  // --- ConfirmModal state — 3 independent flows -----------------
  // §6.68 data_fine-past, §6.67 delete, §6.185 cascade extended trim.

  const [dataFineConfirmOpen, setDataFineConfirmOpen] = useState(false);
  const salvaTriggerRef = useRef(null);
  const [dataFinePendingPayload, setDataFinePendingPayload] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteTriggerRef = useRef(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  // CP8 §6.185: cascade ConfirmModal state for extended trim.
  const [cascadeConfirmOpen, setCascadeConfirmOpen] = useState(false);
  const [cascadePendingPayload, setCascadePendingPayload] = useState(null);
  const [cascadeOrariCount, setCascadeOrariCount] = useState(0);
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
        if (mode === 'create') {
          const oraPrevista = orariPreview[0];
          if (oraPrevista) {
            const today = todayIso();
            actions.showToast(
              `✅ ${farmacoData.nome} aggiunto. Prima dose: ${
                formatPrimaDose(farmacoData.data_inizio, oraPrevista, today)
              }.`
            );
          }
        }
        onClose();
      }
      return result;
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Apply data_fine-past interceptor (§6.68) and delegate to commitSave.
   * Extracted so cascade-confirmed payloads can re-enter the chain
   * without duplicating the past-date check (§6.185 sequencing).
   */
  async function proceedSaveOrIntercept(payload) {
    if (payload.farmacoData.data_fine && payload.farmacoData.data_fine < isoToday()) {
      setDataFinePendingPayload(payload);
      setDataFineConfirmOpen(true);
      return;
    }
    await commitSave(payload);
  }

  async function handleSalva() {
    const payload = normalizeForm(form);
    // CP8 §6.185: cascade interceptor — extended form with >1 orari rows
    // means user added rows before flipping to extended (or imported
    // legacy). Trim payload.orari to first row, surface confirm modal.
    if (isExtendedForm && form.orari.length > 1) {
      const trimmed = {
        ...payload,
        orari: payload.orari.slice(0, 1),
      };
      setCascadeOrariCount(form.orari.length - 1);
      setCascadePendingPayload(trimmed);
      setCascadeConfirmOpen(true);
      return;
    }
    await proceedSaveOrIntercept(payload);
  }

  async function confirmCascade() {
    const payload = cascadePendingPayload;
    setCascadeConfirmOpen(false);
    setCascadePendingPayload(null);
    setCascadeOrariCount(0);
    if (payload) await proceedSaveOrIntercept(payload);
  }

  function cancelCascade() {
    setCascadeConfirmOpen(false);
    setCascadePendingPayload(null);
    setCascadeOrariCount(0);
    // Drawer stays open; form dirty preserved.
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

  // CP8 §6.183: intervallo total > 0 required when tipo='intervallo'.
  const intervalloOreTotal = useMemo(() => {
    if (form.tipo_frequenza !== 'intervallo') return 0;
    const g = form.intervallo_giorni === '' ? 0 : Number(form.intervallo_giorni);
    const o = form.intervallo_ore_residue === '' ? 0 : Number(form.intervallo_ore_residue);
    if (!Number.isFinite(g) || !Number.isFinite(o)) return 0;
    return joinIntervalloHours(g, o);
  }, [form.tipo_frequenza, form.intervallo_giorni, form.intervallo_ore_residue]);

  const hasIntervalloOreRequired =
    form.tipo_frequenza !== 'intervallo' || intervalloOreTotal > 0;

  const intervalloGiorniValid = useMemo(() => {
    if (form.intervallo_giorni === '') return true;
    const g = Number(form.intervallo_giorni);
    return Number.isFinite(g) && g >= 0 && g <= GIORNI_MAX && Number.isInteger(g);
  }, [form.intervallo_giorni]);

  const intervalloOreResidueValid = useMemo(() => {
    if (form.intervallo_ore_residue === '') return true;
    const o = Number(form.intervallo_ore_residue);
    if (!Number.isFinite(o) || o < 0 || o > ORE_RESIDUE_MAX) return false;
    // Step 0.5: value*2 must be integer.
    return Number.isInteger(o * 2);
  }, [form.intervallo_ore_residue]);

  const dataInizioValid = mode === 'edit' || form.data_inizio >= todayIso();

  const allRequiredFilled =
    form.nome.trim().length > 0 &&
    form.tipo_frequenza !== '' &&
    form.dosi_giornaliere !== '' && Number(form.dosi_giornaliere) > 0 &&
    form.relazione_pasto !== '' &&
    form.data_inizio !== '' &&
    dataInizioValid &&
    hasIntervalloOreRequired &&
    intervalloGiorniValid &&
    intervalloOreResidueValid;

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
    intervalloOreTotal > 0 &&
    Number(form.intervallo_minimo_ore) >= intervalloOreTotal;

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
    return wrapCount > 1
      ? 'Ordine orari anomalo: più di un attraversamento di mezzanotte'
      : null;
  }, [orariPreview]);

  const isDirty = useMemo(() => {
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
          required
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
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
              Intervallo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="farmaco-intervallo-giorni"
                  className="text-xs font-medium"
                  style={{ color: t.textSecondary }}
                >
                  Giorni
                </label>
                <input
                  id="farmaco-intervallo-giorni"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={GIORNI_MAX}
                  step={1}
                  value={form.intervallo_giorni}
                  onChange={(e) => updateField('intervallo_giorni', e.target.value)}
                  className="rounded px-3 py-2 border tabular-nums"
                  style={{
                    background: t.modalBg,
                    color: t.textPrimary,
                    borderColor: intervalloGiorniValid ? t.tapBd : t.red,
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="farmaco-intervallo-ore-residue"
                  className="text-xs font-medium"
                  style={{ color: t.textSecondary }}
                >
                  Ore
                </label>
                <input
                  id="farmaco-intervallo-ore-residue"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={ORE_RESIDUE_MAX}
                  step={ORE_RESIDUE_STEP}
                  value={form.intervallo_ore_residue}
                  onChange={(e) => updateField('intervallo_ore_residue', e.target.value)}
                  className="rounded px-3 py-2 border tabular-nums"
                  style={{
                    background: t.modalBg,
                    color: t.textPrimary,
                    borderColor: intervalloOreResidueValid ? t.tapBd : t.red,
                  }}
                />
              </div>
            </div>
            {(!intervalloGiorniValid || !intervalloOreResidueValid) && (
              <p className="text-xs" role="status" style={{ color: t.red }}>
                {!intervalloGiorniValid
                  ? `Giorni: numero intero tra 0 e ${GIORNI_MAX}`
                  : `Ore: tra 0 e ${ORE_RESIDUE_MAX}, passo 0.5`}
              </p>
            )}
          </div>
        )}

        {isIntervallo && !isExtendedForm && (
          <FormCheckbox
            id="farmaco-custom-minimo"
            label="Personalizza limite minimo"
            checked={form.custom_minimo}
            onChange={toggleCustomMinimo}
            theme={t}
          />
        )}

        {isIntervallo && !isExtendedForm && form.custom_minimo && (
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

        <div className="flex flex-col gap-1">
          <label
            htmlFor="farmaco-dosi-giornaliere"
            className="text-sm font-medium"
            style={{ color: t.textPrimary }}
          >
            Dosi giornaliere
          </label>
          <input
            id="farmaco-dosi-giornaliere"
            type="number"
            value={form.dosi_giornaliere}
            onChange={(e) => updateField('dosi_giornaliere', e.target.value)}
            disabled={isExtendedForm}
            data-testid="farmaco-dosi-giornaliere-input"
            className="rounded px-3 py-2 border disabled:opacity-50"
            style={{
              background: t.modalBg,
              color: t.textPrimary,
              borderColor: t.tapBd,
            }}
          />
          {isExtendedForm && (
            <p className="text-xs italic" style={{ color: t.textSecondary }}>
              Fissata a 1 per intervalli oltre le 24 ore.
            </p>
          )}
        </div>

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
        <SectionHeading theme={t}>Avanzate</SectionHeading>

        <FormSelect
          id="farmaco-relazione-pasto"
          label="Relazione con il pasto"
          value={form.relazione_pasto}
          onChange={(v) => updateField('relazione_pasto', v)}
          options={RELAZIONE_PASTO_OPTIONS}
          theme={t}
          required
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
          warning={
            !dataInizioValid && form.data_inizio !== ''
              ? 'La data inizio non può essere nel passato'
              : null
          }
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
              ref={deleteTriggerRef}
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
          {!allRequiredFilled && (
            <p
              className="text-xs text-center opacity-70"
              role="status"
              style={{ color: t.textPrimary }}
            >
              Compila i campi obbligatori (<span aria-hidden="true" className="text-red-500">*</span>)
            </p>
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
              ref={salvaTriggerRef}
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

      {/* --- ConfirmModal: cascade extended trim (§6.185) ----------- */}
      <ConfirmModal
        open={cascadeConfirmOpen}
        triggerRef={salvaTriggerRef}
        title="Intervallo oltre le 24 ore"
        body={
          <p>
            Per intervalli oltre le 24 ore è prevista una sola dose per ciclo.
            {' '}
            {cascadeOrariCount === 1
              ? 'Verrà rimosso 1 orario aggiuntivo.'
              : `Verranno rimossi ${cascadeOrariCount} orari aggiuntivi.`}
            {' '}
            Confermi?
          </p>
        }
        confirmLabel="Conferma"
        cancelLabel="Annulla"
        onConfirm={confirmCascade}
        onCancel={cancelCascade}
      />

      {/* --- ConfirmModal: data_fine nel passato (§6.68) ------------ */}
      <ConfirmModal
        open={dataFineConfirmOpen}
        triggerRef={salvaTriggerRef}
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
        triggerRef={deleteTriggerRef}
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

      {/* --- UnsavedChangesModal: close path guard (§6.98) ---------- */}
      <UnsavedChangesModal
        open={unsavedConfirmOpen}
        onCancel={() => setUnsavedConfirmOpen(false)}
        onDiscard={() => {
          setUnsavedConfirmOpen(false);
          doAnnulla();
        }}
      />
    </div>
  );
}

// ============================================================
// OrarioRow — single dose timing row.
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
// Internal form helpers.
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

function FormField({ id, label, value, onChange, type, theme: t, warning, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
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

function FormSelect({ id, label, value, onChange, options, theme: t, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: t.textPrimary }}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
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
