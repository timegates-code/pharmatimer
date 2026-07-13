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
import OrarioRow from './OrarioRow.jsx';
import OccorrenzaRow from './OccorrenzaRow.jsx';
import FormField from './FormField.jsx';
import FormSelect from './FormSelect.jsx';
import FormTextarea from './FormTextarea.jsx';
import FormCheckbox from './FormCheckbox.jsx';

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

// P3 par.22.198-ter: helpers modalita' 'orari specifici' (intervallo <=24h).
// SENTINEL_PAR_22_198_TER_P3
const SPECIFICI_PRIMA_DOSE_MIN = 8 * 60; // default prima dose 08:00

function intervalloStepMinutes(form) {
  const g = Number(form.intervallo_giorni) || 0;
  const h = Number(form.intervallo_ore_residue) || 0;
  const tot = g * 24 + h;
  if (!(tot > 0) || tot > EXTENDED_THRESHOLD_HOURS) return null;
  return Math.round(tot * 60);
}

function makeAssolutoOrario(doseNumero, offsetMinuti, descrizione = '') {
  const norm = ((Math.round(Number(offsetMinuti) || 0) % 1440) + 1440) % 1440;
  return {
    dose_numero: doseNumero,
    offset_minuti: norm,
    ancora_riferimento: 'assoluto',
    descrizione_momento: descrizione,
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
  occorrenze: [],
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

// ------------------------------------------------------------
// fisso_date helpers (F14 Blocco 2, Spec v1.16 — lista piatta).
// SENTINEL_PAR_22_154_FISSODATE
// ------------------------------------------------------------

const OCCORRENZE_MAX_DATES = 30;

// SENTINEL_PAR_22_157_UXG_GROUPING -- F14 Blocco 4 (par.22.157), UX-g A-flat/visual.
// Re-layout presentazionale della sezione "Date e orari": grouping per data.
// Modello lista-piatta, helper di derivazione, validazione e OccorrenzaRow
// restano INVARIATI. Nessuna deviazione.
const MESI_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** 'YYYY-MM-DD' -> 'D mmm YYYY' (italiano), parsing per-parte (no timezone). */
function formatDataHeader(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  const [, y, mm, dd] = m;
  const idx = Number(mm) - 1;
  const mese = idx >= 0 && idx < 12 ? MESI_IT[idx] : mm;
  return `${Number(dd)} ${mese} ${y}`;
}

function makeEmptyOccorrenza() {
  return { data: '', ora: '' };
}

/** 'HH:MM' -> minuti da mezzanotte, null se malformato. */
function hhmmToOffset(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** minuti da mezzanotte -> 'HH:MM'. */
function offsetToHHMM(offset) {
  const o = Number.isFinite(offset) ? ((offset % 1440) + 1440) % 1440 : 0;
  const h = Math.floor(o / 60);
  const m = o % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Ricostruisce le occorrenze form [{data,ora}] dalle righe orari datate
 * (data_specifica valorizzata). Usato in init edit. Ordinato (data, ora).
 */
function occorrenzeFromOrari(rows) {
  return (rows || [])
    .filter((o) => o.data_specifica != null)
    .map((o) => ({
      data: String(o.data_specifica),
      ora: offsetToHHMM(Number(o.offset_minuti) || 0),
    }))
    .sort((a, b) => (a.data === b.data ? a.ora.localeCompare(b.ora) : a.data.localeCompare(b.data)));
}

/**
 * Derivazione pura dalle occorrenze. Raggruppa per data, ordina per ora,
 * assegna dose_numero 1..k_D per data (lista piatta, validatore par.153).
 * Righe incomplete (data/ora mancante o ora invalida) scartate qui;
 * la completezza e validata a parte per il gating di canSave.
 */
function deriveOccorrenzePayload(occorrenze) {
  const clean = (occorrenze || []).filter(
    (oc) => oc && oc.data && oc.ora && hhmmToOffset(oc.ora) != null,
  );
  const byDate = {};
  for (const oc of clean) {
    (byDate[oc.data] = byDate[oc.data] || []).push(oc.ora);
  }
  const dates = Object.keys(byDate).sort();
  const orari = [];
  let maxK = 0;
  for (const d of dates) {
    const ore = byDate[d].slice().sort((a, b) => a.localeCompare(b));
    maxK = Math.max(maxK, ore.length);
    ore.forEach((ora, idx) => {
      orari.push({
        dose_numero: idx + 1,
        offset_minuti: hhmmToOffset(ora),
        ancora_riferimento: 'assoluto',
        ora_prevista: ora,
        descrizione_momento: null,
        data_specifica: d,
      });
    });
  }
  return {
    orari,
    dataInizio: dates.length ? dates[0] : null,
    dataFine: dates.length ? dates[dates.length - 1] : null,
    dosiGiornaliere: maxK || 1,
    distinctDates: dates.length,
  };
}

/**
 * Branch di normalizeForm per tipo_frequenza === 'fisso_date'.
 * farmacoData con data_inizio/fine/dosi derivati + orari lista piatta.
 */
function normalizeFissoDate(f) {
  const trimOrNull = (s) => {
    const v = (s ?? '').trim();
    return v === '' ? null : v;
  };
  const d = deriveOccorrenzePayload(f.occorrenze);
  const farmacoData = {
    nome: (f.nome ?? '').trim(),
    principio_attivo: trimOrNull(f.principio_attivo),
    funzione: trimOrNull(f.funzione),
    tipo_frequenza: 'fisso_date',
    intervallo_ore: null,
    intervallo_minimo_ore: null,
    dosi_giornaliere: d.dosiGiornaliere,
    relazione_pasto: f.relazione_pasto,
    dettaglio_pasto: trimOrNull(f.dettaglio_pasto),
    note: trimOrNull(f.note),
    data_inizio: d.dataInizio,
    data_fine: d.dataFine,
  };
  return { farmacoData, orari: d.orari };
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
      {/* B24 par.22.198-ter (D5): sticky action header sotto la ConfigTabBar.
          Offset = altezza bar: safe-area + py-3 (1.5rem) + line-height
          text-sm (1.25rem) + border-b (1px) = safe-area + 2.75rem + 1px.
          Se ConfigTabBar cambia padding/typography, aggiornare qui.
          SENTINEL_PAR_22_198_TER_B24 */}
      <header
        className="flex items-center justify-between mb-4 sticky z-20 -mx-4 px-4 py-2"
        style={{
          top: 'calc(env(safe-area-inset-top) + 2.75rem + 1px)',
          background: t.headerBg,
          borderBottom: `1px solid ${t.headerBorder}`,
        }}
      >
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
  // P12 par.22.198-ter: extended (>24h) card hides the misleading '1x/die'.
  // SENTINEL_PAR_22_198_TER_P12
  const isExtendedCard = isIntervallo &&
    Number(farmaco.intervallo_ore) > EXTENDED_THRESHOLD_HOURS;

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
          {!isExtendedCard && <>{farmaco.dosi_giornaliere}×/die</>}
          {frequencyLabel && (
            <span>{isExtendedCard ? frequencyLabel : <> · {frequencyLabel}</>}</span>
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
        // F14 Blocco 2 (fisso_date): ricostruzione occorrenze (data,ora) dalle
        // righe datate. SENTINEL_PAR_22_154_FISSODATE.
        const occorrenzeInit = occorrenzeFromOrari(
          (state.orari || []).filter((o) => o.farmaco_id === editingId),
        );
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
          occorrenze: occorrenzeInit,
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
          // P3 par.22.198-ter: in modalita' 'orari specifici' (tutte le
          // righe assoluto) le nuove righe continuano il passo di
          // intervallo dall'ultima. SENTINEL_PAR_22_198_TER_P3_ADD
          const allAssoluto = f.orari.length > 0 &&
            f.orari.every((o) => o.ancora_riferimento === 'assoluto');
          const stepMin = intervalloStepMinutes(next);
          const lastOffset = f.orari.length > 0
            ? Number(f.orari[f.orari.length - 1].offset_minuti) || 0
            : SPECIFICI_PRIMA_DOSE_MIN;
          const added = [];
          for (let i = current + 1; i <= desired; i++) {
            added.push(
              allAssoluto && stepMin
                ? makeAssolutoOrario(i, lastOffset + (i - current) * stepMin)
                : makeDefaultOrario(i),
            );
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

  // P3 par.22.198-ter: toggle 'ai pasti' / 'orari specifici'. La modalita'
  // e' DERIVATA dalle righe (tutte assoluto -> specifici), nessuno stato
  // extra. Prefill one-shot allo switch; righe poi liberamente editabili
  // (nessun ricalcolo retroattivo). SENTINEL_PAR_22_198_TER_P3_SWITCH
  function switchOrariMode(mode) {
    setForm((f) => {
      const step = intervalloStepMinutes(f) ?? 0;
      const orari = f.orari.map((o, i) => (
        mode === 'specifici'
          ? makeAssolutoOrario(
              o.dose_numero ?? i + 1,
              SPECIFICI_PRIMA_DOSE_MIN + i * step,
              o.descrizione_momento || '',
            )
          : {
              ...makeDefaultOrario(o.dose_numero ?? i + 1),
              descrizione_momento: o.descrizione_momento || '',
            }
      ));
      return { ...f, orari };
    });
    setDirty(true);
  }

  // F14 Blocco 2 (fisso_date): handler repeater occorrenze. SENTINEL_PAR_22_154_FISSODATE.
  function addOccorrenza() {
    setForm((f) => ({ ...f, occorrenze: [...(f.occorrenze || []), makeEmptyOccorrenza()] }));
    setDirty(true);
  }

  function updateOccorrenza(index, name, value) {
    setForm((f) => {
      const occorrenze = (f.occorrenze || []).map((oc, i) => (
        i === index ? { ...oc, [name]: value } : oc
      ));
      return { ...f, occorrenze };
    });
    setDirty(true);
  }

  function removeOccorrenza(index) {
    setForm((f) => ({
      ...f,
      occorrenze: (f.occorrenze || []).filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  // F14 Blocco 4 (par.22.157, UX-g): aggiunge un orario al gruppo-data esistente.
  function addOccorrenzaForData(data) {
    setForm((f) => ({ ...f, occorrenze: [...(f.occorrenze || []), { data, ora: '' }] }));
    setDirty(true);
  }

  // F14 Blocco 4 (par.22.160, UX-f): merge additivo delle coppie raccolte
  // dal flusso guidato. Semantica A: rimuove le righe INTERAMENTE vuote
  // (seed placeholder) e appende le coppie; le righe gia compilate a mano
  // sopravvivono. Nessun dose_numero qui (resta a deriveOccorrenzePayload).
  // SENTINEL_PAR_22_160_UXF_WIZARD.
  function mergeOccorrenzeFromWizard(pairs) {
    if (!pairs || pairs.length === 0) return;
    setForm((f) => {
      const kept = (f.occorrenze || []).filter((oc) => oc.data || oc.ora);
      return { ...f, occorrenze: [...kept, ...pairs] };
    });
    setDirty(true);
  }

  function wizardStart() {
    setWizard({ step: 'data', data: '', k: 1, orari: [''], oraIdx: 0, pending: [] });
  }
  function wizardCancel() {
    setWizard(null);
  }
  function wizardPatch(patch) {
    setWizard((w) => (w ? { ...w, ...patch } : w));
  }
  function wizardSetOra(value) {
    setWizard((w) => (
      w ? { ...w, orari: w.orari.map((o, i) => (i === w.oraIdx ? value : o)) } : w
    ));
  }
  function wizardGoNext() {
    setWizard((w) => {
      if (!w) return w;
      if (w.step === 'data') return { ...w, step: 'quante' };
      if (w.step === 'quante') {
        const k = Math.max(1, w.k);
        const orari = Array.from({ length: k }, (_, i) => w.orari[i] || '');
        return { ...w, k, orari, oraIdx: 0, step: 'orari' };
      }
      if (w.step === 'orari') {
        if (w.oraIdx < w.k - 1) return { ...w, oraIdx: w.oraIdx + 1 };
        return { ...w, step: 'riepilogo' };
      }
      return w;
    });
  }
  function wizardGoBack() {
    setWizard((w) => {
      if (!w) return w;
      if (w.step === 'quante') return { ...w, step: 'data' };
      if (w.step === 'orari') {
        if (w.oraIdx > 0) return { ...w, oraIdx: w.oraIdx - 1 };
        return { ...w, step: 'quante' };
      }
      if (w.step === 'riepilogo') return { ...w, step: 'orari', oraIdx: Math.max(0, w.k - 1) };
      return w;
    });
  }
  function wizardConfirmDay() {
    setWizard((w) => {
      if (!w) return w;
      const pairs = w.orari.filter((o) => o).map((o) => ({ data: w.data, ora: o }));
      return { ...w, pending: [...w.pending, ...pairs], step: 'altra' };
    });
  }
  function wizardAnotherDay() {
    setWizard((w) => (
      w ? { ...w, step: 'data', data: '', k: 1, orari: [''], oraIdx: 0 } : w
    ));
  }
  function wizardFinish() {
    if (wizard && wizard.pending.length) mergeOccorrenzeFromWizard(wizard.pending);
    setWizard(null);
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
      const clearsIntervallo = value === 'fisso' || value === 'fisso_date';
      const next = {
        ...f,
        tipo_frequenza: value,
        intervallo_giorni: clearsIntervallo ? '' : f.intervallo_giorni,
        intervallo_ore_residue: clearsIntervallo ? '' : f.intervallo_ore_residue,
        custom_minimo: clearsIntervallo ? false : f.custom_minimo,
        intervallo_minimo_ore: clearsIntervallo ? '' : f.intervallo_minimo_ore,
        // F14 Blocco 2: seed una occorrenza vuota all'ingresso in fisso_date.
        occorrenze: value === 'fisso_date' && (f.occorrenze || []).length === 0
          ? [makeEmptyOccorrenza()]
          : f.occorrenze,
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
    // F14 Blocco 2 (fisso_date, Spec v1.16): lista piatta (data,ora). SENTINEL_PAR_22_154_FISSODATE.
    if (tipo === 'fisso_date') {
      return normalizeFissoDate(f);
    }
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
      // BUG-k fix (s.6.246, Opzione B): include the PWA-computed
      // ora_prevista snapshot in the bulk-replace payload. The backend
      // OrarioCreate model requires ora_prevista (non-nullable); without
      // it PUT /api/farmaci/{id}/orari returns 422 and the orari are never
      // persisted (farmaco left orphaned with orari=[]). profiloAttivo is
      // guaranteed present here: the drawer is only reachable when
      // status==='ready', which init() reaches only with an active profilo
      // (else NO_ACTIVE_PROFILE), so computeOraPrevista always returns
      // 'HH:MM'. In Dexie/local mode the snapshot is harmless: planBuilder
      // recomputes ora_prevista at read time.
      // SENTINEL_BUGK_S6246_ORA_PREVISTA
      ora_prevista: computeOraPrevista(
        {
          dose_numero: Number(o.dose_numero),
          offset_minuti: Number(o.offset_minuti) || 0,
          ancora_riferimento: o.ancora_riferimento,
        },
        profiloAttivo,
      ),
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

  // F14 Blocco 4 (par.22.160, UX-f): stato locale del flusso guidato
  // ("Compilazione guidata"). null = chiuso. SENTINEL_PAR_22_160_UXF_WIZARD.
  const [wizard, setWizard] = useState(null);

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
          const oraPrevista = isFissoDate ? (orari[0]?.ora_prevista ?? null) : orariPreview[0];
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

  const isFissoDate = form.tipo_frequenza === 'fisso_date';

  // P1 par.22.198-ter: progressive disclosure flag (D1).
  // SENTINEL_PAR_22_198_TER_P1_FLAG
  const tipoSelected = form.tipo_frequenza !== '';

  // F14 Blocco 2 (fisso_date): derivazioni read-only + validazione. SENTINEL_PAR_22_154_FISSODATE.
  const fissoDateDerived = useMemo(() => {
    const occ = form.occorrenze || [];
    const filled = occ.filter((oc) => oc.data && oc.ora);
    const allFilled =
      occ.length > 0 &&
      filled.length === occ.length &&
      occ.every((oc) => hhmmToOffset(oc.ora) != null);
    const seen = new Set();
    let hasDuplicate = false;
    for (const oc of filled) {
      const key = `${oc.data}T${oc.ora}`;
      if (seen.has(key)) { hasDuplicate = true; break; }
      seen.add(key);
    }
    const distinctDates = new Set(filled.map((oc) => oc.data)).size;
    const today = todayIso();
    const hasPastInCreate = mode === 'create' && filled.some((oc) => oc.data < today);
    const d = deriveOccorrenzePayload(occ);
    const valid =
      occ.length > 0 &&
      allFilled &&
      !hasDuplicate &&
      distinctDates <= OCCORRENZE_MAX_DATES &&
      !hasPastInCreate;
    return {
      dataInizio: d.dataInizio,
      dataFine: d.dataFine,
      dosiGiornaliere: d.dosiGiornaliere,
      distinctDates,
      hasDuplicate,
      hasPastInCreate,
      allFilled,
      valid,
    };
  }, [form.occorrenze, mode]);

  // F14 Blocco 4 (par.22.157, UX-g): sequenza di RENDER raggruppata per data.
  // Produce una lista PIATTA di item (header | row | add) renderizzati come
  // fratelli in UN UNICO parent: cosi una OccorrenzaRow che cambia data viene
  // SPOSTATA (non rimontata) da React -> il nodo resta montato (focus + il
  // riferimento DOM catturato dai test restano validi). Le righe datate sono
  // raggruppate per valore `data` (date ascending), ordine-array dentro il
  // gruppo; le righe senza data restano in coda (A-flat). Nessun re-sort
  // dell'array di stato form.occorrenze.
  const occorrenzeGroups = useMemo(() => {
    const indexed = (form.occorrenze || []).map((oc, i) => ({ oc, i }));
    const datate = indexed.filter(({ oc }) => oc.data);
    const senzaData = indexed.filter(({ oc }) => !oc.data);
    const dateOrd = Array.from(new Set(datate.map(({ oc }) => oc.data))).sort();
    const items = [];
    for (const d of dateOrd) {
      const righe = datate.filter(({ oc }) => oc.data === d);
      items.push({ kind: 'header', data: d, count: righe.length });
      for (const r of righe) items.push({ kind: 'row', i: r.i, oc: r.oc });
      items.push({ kind: 'add', data: d });
    }
    for (const r of senzaData) items.push({ kind: 'row', i: r.i, oc: r.oc });
    return items;
  }, [form.occorrenze]);

  const allRequiredFilled = isFissoDate
    ? (
        form.nome.trim().length > 0 &&
        form.relazione_pasto !== '' &&
        fissoDateDerived.valid
      )
    : (
        form.nome.trim().length > 0 &&
        form.tipo_frequenza !== '' &&
        form.dosi_giornaliere !== '' && Number(form.dosi_giornaliere) > 0 &&
        form.relazione_pasto !== '' &&
        form.data_inizio !== '' &&
        dataInizioValid &&
        hasIntervalloOreRequired &&
        intervalloGiorniValid &&
        intervalloOreResidueValid
      );

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

  // P14 par.22.198-ter (D4): conteggio dosi odierne gia' trascorse in
  // create-mode con data_inizio = oggi. SENTINEL_PAR_22_198_TER_P14
  const pastDosesToday = useMemo(() => {
    if (mode !== 'create' || isFissoDate) return 0;
    if (form.data_inizio !== todayIso()) return 0;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return orariPreview.filter((x) => {
      if (typeof x !== 'string' || !/^\d{2}:\d{2}$/.test(x)) return false;
      const [h, m] = x.split(':').map(Number);
      return h * 60 + m < nowMin;
    }).length;
  }, [mode, isFissoDate, form.data_inizio, orariPreview]);

  const isDirty = useMemo(() => {
    for (const k of Object.keys(EMPTY_FORM)) {
      if (k === 'orari' || k === 'occorrenze') continue;
      if (form[k] !== initial[k]) return true;
    }
    // F14 Blocco 2 (fisso_date): diff contenuto occorrenze. SENTINEL_PAR_22_154_FISSODATE.
    {
      const ao = form.occorrenze || [];
      const bo = initial.occorrenze || [];
      if (ao.length !== bo.length) return true;
      for (let i = 0; i < ao.length; i++) {
        if (!bo[i] || ao[i].data !== bo[i].data || ao[i].ora !== bo[i].ora) return true;
      }
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

  // P3 par.22.198-ter: modalita' orari derivata dalle righe.
  // SENTINEL_PAR_22_198_TER_P3_MODE
  const orariMode = form.orari.length > 0 &&
    form.orari.every((o) => o.ancora_riferimento === 'assoluto')
    ? 'specifici'
    : 'pasti';

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
          label="Nome farmaco"
          value={form.nome}
          onChange={(v) => updateField('nome', v)}
          type="text"
          theme={t}
          required
          warning={duplicateMatch ? `Nome già usato da «${duplicateMatch}»` : null}
        />
        {/* P1 par.22.198-ter: anagrafica estesa gated su tipoSelected (D1).
            SENTINEL_PAR_22_198_TER_P1_ANAG */}
        {tipoSelected && (<>
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
        </>)}

        {/* --- Sezione 2: Frequenza & Dosi ---------------------- */}
        <SectionHeading theme={t}>Frequenza & Dosi</SectionHeading>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium" style={{ color: t.textPrimary }}>
            Tipo frequenza
            <span aria-hidden="true" className="text-red-500 ml-1">*</span>
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
            <label className="flex items-center gap-2" style={{ color: t.textPrimary }}>
              <input
                type="radio"
                name="tipo_frequenza"
                value="fisso_date"
                checked={form.tipo_frequenza === 'fisso_date'}
                onChange={() => updateTipoFrequenza('fisso_date')}
              />
              <span>Date specifiche</span>
            </label>
          </div>
        </fieldset>

        {/* P1 par.22.198-ter (D1): tutte le sezioni successive restano
            nascoste finche' non e' scelto un tipo frequenza.
            SENTINEL_PAR_22_198_TER_P1_GATE */}
        {tipoSelected && (<>

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

        {isFissoDate && (
          <>
            {/* --- Sezione 3 (fisso_date): Date e orari ----------- */}
            <SectionHeading theme={t}>Date e orari</SectionHeading>
            {/* SENTINEL_PAR_22_158_UXE_NESTING -- R1: nesting righe sotto data + gerarchia bottoni + box periodo (presentazionale) */}

            <p className="text-xs italic" style={{ color: t.textSecondary }}>
              Aggiungi una riga per ogni assunzione: scegli la data e l’orario.
            </p>

            {/* SENTINEL_PAR_22_160_UXF_WIZARD -- UX-f: flusso guidato anziani (parallelo opt-in, inline) */}
            {!wizard && (
              <button
                type="button"
                onClick={wizardStart}
                data-testid="occorrenze-wizard-start"
                className="self-start text-sm font-semibold px-3 py-2 rounded-md border min-h-[44px]"
                style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.textPrimary }}
              >
                Compilazione guidata
              </button>
            )}

            {wizard && (
              <div
                data-testid="occorrenze-wizard"
                role="group"
                aria-label="Compilazione guidata"
                className="rounded-md border p-4 flex flex-col gap-4"
                style={{ background: t.modalBg, borderColor: t.textPrimary }}
              >
                {wizard.step === 'data' && (
                  <>
                    <p className="text-base font-semibold" style={{ color: t.textPrimary }}>
                      In quale giorno lo prende?
                    </p>
                    <input
                      type="date"
                      aria-label="Giorno"
                      value={wizard.data}
                      onChange={(e) => wizardPatch({ data: e.target.value })}
                      className="rounded px-3 py-2.5 border text-base min-h-[44px]"
                      style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}
                    />
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={wizardCancel}
                        className="text-sm px-3 py-2 rounded-md min-h-[44px]"
                        style={{ color: t.textSecondary }}>
                        Annulla
                      </button>
                      <button type="button" onClick={wizardGoNext} disabled={!wizard.data}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary, opacity: wizard.data ? 1 : 0.5 }}>
                        Avanti
                      </button>
                    </div>
                  </>
                )}

                {wizard.step === 'quante' && (
                  <>
                    <p className="text-base font-semibold" style={{ color: t.textPrimary }}>
                      Quante volte lo prende quel giorno?
                    </p>
                    <div className="flex items-center gap-4">
                      <button type="button" aria-label="Diminuisci"
                        onClick={() => wizardPatch({ k: Math.max(1, wizard.k - 1) })}
                        className="flex items-center justify-center min-h-[44px] min-w-[44px] text-xl rounded-md border"
                        style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}>
                        -
                      </button>
                      <span data-testid="wizard-k-value" className="text-xl font-semibold tabular-nums"
                        style={{ color: t.textPrimary }}>
                        {wizard.k}
                      </span>
                      <button type="button" aria-label="Aumenta"
                        onClick={() => wizardPatch({ k: wizard.k + 1 })}
                        className="flex items-center justify-center min-h-[44px] min-w-[44px] text-xl rounded-md border"
                        style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}>
                        +
                      </button>
                    </div>
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={wizardGoBack}
                        className="text-sm px-3 py-2 rounded-md min-h-[44px]"
                        style={{ color: t.textSecondary }}>
                        Indietro
                      </button>
                      <button type="button" onClick={wizardGoNext}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary }}>
                        Avanti
                      </button>
                    </div>
                  </>
                )}

                {wizard.step === 'orari' && (
                  <>
                    <p className="text-base font-semibold" style={{ color: t.textPrimary }}>
                      A che ora? (orario {wizard.oraIdx + 1} di {wizard.k})
                    </p>
                    <input
                      type="time"
                      aria-label="Orario"
                      value={wizard.orari[wizard.oraIdx] || ''}
                      onChange={(e) => wizardSetOra(e.target.value)}
                      className="rounded px-3 py-2.5 border text-base min-h-[44px] tabular-nums"
                      style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}
                    />
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={wizardGoBack}
                        className="text-sm px-3 py-2 rounded-md min-h-[44px]"
                        style={{ color: t.textSecondary }}>
                        Indietro
                      </button>
                      <button type="button" onClick={wizardGoNext} disabled={!wizard.orari[wizard.oraIdx]}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary, opacity: wizard.orari[wizard.oraIdx] ? 1 : 0.5 }}>
                        Avanti
                      </button>
                    </div>
                  </>
                )}

                {wizard.step === 'riepilogo' && (
                  <>
                    <p className="text-base font-semibold" style={{ color: t.textPrimary }}>
                      Il {formatDataHeader(wizard.data)}: {wizard.orari.filter((o) => o).join(', ')}. Va bene?
                    </p>
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={wizardGoBack}
                        className="text-sm px-3 py-2 rounded-md min-h-[44px]"
                        style={{ color: t.textSecondary }}>
                        Correggi
                      </button>
                      <button type="button" onClick={wizardConfirmDay}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary }}>
                        Va bene
                      </button>
                    </div>
                  </>
                )}

                {wizard.step === 'altra' && (
                  <>
                    <p className="text-base font-semibold" style={{ color: t.textPrimary }}>
                      Aggiungere un altro giorno?
                    </p>
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={wizardFinish}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.modalBg, color: t.textPrimary, borderColor: t.tapBd }}>
                        No, ho finito
                      </button>
                      <button type="button" onClick={wizardAnotherDay}
                        className="text-base font-semibold px-4 py-2 rounded-md border min-h-[44px]"
                        style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary }}>
                        Si, aggiungi
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {occorrenzeGroups.map((item) => {
                if (item.kind === 'header') {
                  return (
                    <div
                      key={`occ-hdr-${item.data}`}
                      className="flex items-center justify-between mt-4 pb-1 border-b"
                      style={{ borderColor: t.tapBd }}
                    >
                      <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                        {formatDataHeader(item.data)}
                      </span>
                      <span className="text-xs" style={{ color: t.textSecondary }}>
                        {item.count} {item.count === 1 ? 'orario' : 'orari'}
                      </span>
                    </div>
                  );
                }
                if (item.kind === 'add') {
                  return (
                    <button
                      key={`occ-add-${item.data}`}
                      type="button"
                      onClick={() => addOccorrenzaForData(item.data)}
                      className="self-start ml-3 text-xs font-medium px-1 py-0.5 rounded"
                      style={{ background: 'transparent', color: t.textSecondary }}
                    >
                      + orario
                    </button>
                  );
                }
                return (
                  <div
                    key={`occ-${item.i}`}
                    className="pl-3"
                    style={{ borderLeft: `2px solid ${t.tapBd}` }}
                  >
                    <OccorrenzaRow
                      index={item.i}
                      occorrenza={item.oc}
                      onChange={(name, value) => updateOccorrenza(item.i, name, value)}
                      onRemove={() => removeOccorrenza(item.i)}
                      theme={t}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addOccorrenza}
              className="self-start text-sm font-medium px-3 py-2 rounded-md border"
              style={{ background: t.textPrimary, color: t.modalBg, borderColor: t.textPrimary }}
            >
              + Aggiungi data
            </button>

            {form.occorrenze.length > 0 && fissoDateDerived.allFilled && !fissoDateDerived.hasDuplicate && (
              <div
                role="status"
                className="text-xs rounded-md border px-3 py-2"
                style={{ background: t.modalBg, borderColor: t.tapBd, color: t.textSecondary }}
              >
                Periodo: {fissoDateDerived.dataInizio} → {fissoDateDerived.dataFine}
                {' · '}Max dosi in un giorno: {fissoDateDerived.dosiGiornaliere}
              </div>
            )}

            {fissoDateDerived.hasDuplicate && (
              <p className="text-xs" role="status" style={{ color: t.red }}>
                Data e orario duplicati: ogni assunzione deve essere distinta.
              </p>
            )}

            {fissoDateDerived.distinctDates > OCCORRENZE_MAX_DATES && (
              <p className="text-xs" role="status" style={{ color: t.red }}>
                Troppe date: massimo {OCCORRENZE_MAX_DATES}.
              </p>
            )}

            {fissoDateDerived.hasPastInCreate && (
              <p className="text-xs" role="status" style={{ color: t.red }}>
                Le date non possono essere nel passato.
              </p>
            )}
          </>
        )}

        {!isFissoDate && (
        <>
        {/* P2 par.22.198-ter: extended -> riga statica al posto dell'input
            bloccato (input nascosto, non disabled).
            SENTINEL_PAR_22_198_TER_P2 */}
        {isExtendedForm ? (
          <p
            data-testid="farmaco-dosi-statica"
            role="status"
            className="text-sm rounded px-3 py-2 border"
            style={{
              background: t.modalBg,
              color: t.textSecondary,
              borderColor: t.tapBd,
            }}
          >
            Dosi giornaliere: 1 — fissata per intervalli oltre le 24 ore.
          </p>
        ) : (
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
              data-testid="farmaco-dosi-giornaliere-input"
              className="rounded px-3 py-2 border"
              style={{
                background: t.modalBg,
                color: t.textPrimary,
                borderColor: t.tapBd,
              }}
            />
          </div>
        )}

        {/* --- Sezione 3: Orari di assunzione ------------------- */}
        <SectionHeading theme={t}>Orari di assunzione</SectionHeading>

        {/* P3 par.22.198-ter: modalita' orari (solo intervallo <=24h, D3).
            SENTINEL_PAR_22_198_TER_P3_UI */}
        {isIntervallo && !isExtendedForm && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium" style={{ color: t.textPrimary }}>
              Modalità orari
            </legend>
            <div className="flex gap-4 py-1">
              <label className="flex items-center gap-2" style={{ color: t.textPrimary }}>
                <input
                  type="radio"
                  name="orari_mode"
                  value="pasti"
                  checked={orariMode === 'pasti'}
                  onChange={() => switchOrariMode('pasti')}
                />
                <span>Ai pasti</span>
              </label>
              <label className="flex items-center gap-2" style={{ color: t.textPrimary }}>
                <input
                  type="radio"
                  name="orari_mode"
                  value="specifici"
                  checked={orariMode === 'specifici'}
                  onChange={() => switchOrariMode('specifici')}
                />
                <span>Orari specifici</span>
              </label>
            </div>
          </fieldset>
        )}

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
        </>
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
        {!isFissoDate && (
        <>
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
        </>
        )}

        </>)}

        {/* T1 par.22.198-ter (P1/D1): Note sempre visibile — spostata da
            Avanzate per il form vergine Nome+Tipo+Note.
            SENTINEL_PAR_22_198_TER_NOTE */}
        <FormTextarea
          id="farmaco-note"
          label="Note"
          value={form.note}
          onChange={(v) => updateField('note', v)}
          theme={t}
        />

        {/* P14 par.22.198-ter (D4): avviso non bloccante dosi gia' trascorse.
            SENTINEL_PAR_22_198_TER_P14_UI */}
        {pastDosesToday > 0 && (
          <p
            className="text-xs"
            role="status"
            data-testid="farmaco-past-doses-warning"
            style={{ color: t.orange }}
          >
            {pastDosesToday === 1
              ? '1 dose di oggi risulta già trascorsa: comparirà come arretrata nella vista Oggi.'
              : `${pastDosesToday} dosi di oggi risultano già trascorse: compariranno come arretrate nella vista Oggi.`}
          </p>
        )}

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
