import { useState, useMemo, useId, useRef } from 'react';
import { useAppContext } from '../../state/AppContext.jsx';
import { selectProfili, selectProfiloById } from '../../state/selectors.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';
import ConfirmModal from '../shared/ConfirmModal.jsx';

// ============================================================
// ProfiliTab — gestione profili giornalieri (Sessione 8b).
// ============================================================
//
// Scope 8b (per CP):
//   - CP1: lista + card read-only + bottone "+ Nuovo".
//   - CP2 (questo file): drawer bottom-sheet full-height con form
//     6 campi, focus trap, dirty-lifted via props opt, warning
//     inline ordine monotonico. Salva/Elimina/Attiva sono stub
//     (wire thunk in CP3-CP5).
//   - CP3: thunk add/update wire su Salva.
//   - CP4: delete + ConfirmDeleteProfiloModal.
//   - CP5: attivaProfilo wrapper wire su Attiva.
//
// Dirty lifting (pattern ImpostazioniTab §22.6 punto 2):
//   props?.dirty ?? localDirty — ConfigView lifta il flag per il
//   guard cross-tab UnsavedChangesModal. Fallback locale per
//   mount standalone / test isolati.
//
// Annulla UX: ripristino silenzioso + close immediato, nessun
// confirm inline. Il confirm cross-tab vive in ConfigView.
//
// Warning ordine monotonico (AMB-8b.B): inline sotto i campi
// coinvolti quando sveglia < colazione < pranzo < cena è violato.
// role="status" perché non-blocker (Salva resta abilitato).
// ora_sonno esclusa per wrap-mezzanotte (Nottambulo 02:00).

const EMPTY_FORM = {
  nome_profilo: '',
  ora_sveglia: '',
  ora_colazione: '',
  ora_pranzo: '',
  ora_cena: '',
  ora_sonno: '',
};

export default function ProfiliTab(props) {
  const { state } = useAppContext();
  const { tokens: t } = useTheme();
  const profili = selectProfili(state);

  // Dirty lifted (pattern ImpostazioniTab).
  const [localDirty, setLocalDirty] = useState(false);
  const dirty = props?.dirty ?? localDirty;
  const setDirty = props?.setDirty ?? setLocalDirty;

  // Drawer state: null = closed; { mode: 'create' } or
  // { mode: 'edit', id } when open.
  const [drawer, setDrawer] = useState(null);

  // Ref to the button that opened the drawer (for focus restore
  // via useModalA11y triggerRef chain).
  const openerRef = useRef(null);

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
    <section data-testid="config-tab-profili" className="p-4">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold" style={{ color: t.textPrimary }}>
          Profili
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="px-3 py-2 rounded border text-sm font-medium"
          style={{
            background: t.modalBg,
            color: t.textPrimary,
            borderColor: t.tapBd,
          }}
        >
          + Nuovo
        </button>
      </header>

      <ul className="flex flex-col gap-3" role="list">
        {profili.map((p) => (
          <ProfiloCard
            key={p.id}
            profilo={p}
            theme={t}
            onOpen={openEdit}
          />
        ))}
      </ul>

      {drawer !== null && (
        <ProfiloDrawer
          mode={drawer.mode}
          editingId={drawer.mode === 'edit' ? drawer.id : null}
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
// ProfiloCard — riepilogo singolo profilo, click = open edit.
// ============================================================

function ProfiloCard({ profilo, theme: t, onOpen }) {
  const attivo = profilo.attivo === 1;
  return (
    <li
      data-testid={`profilo-card-${profilo.id}`}
      className="rounded-lg border flex items-stretch"
      style={{
        background: t.modalBg,
        borderColor: t.tapBd,
        borderLeft: `4px solid ${attivo ? t.green : t.tapBd}`,
      }}
    >
      <button
        type="button"
        onClick={(e) => onOpen(profilo.id, e)}
        className="flex-1 text-left p-3"
        style={{ background: 'transparent', color: t.textPrimary }}
      >
        <div className="flex items-center gap-2 mb-2">
          <h3
            className="text-base font-semibold truncate"
            style={{ color: t.textPrimary }}
          >
            {profilo.nome_profilo}
          </h3>
          {attivo && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: `${t.green}22`,
                color: t.green,
                border: `1px solid ${t.green}`,
              }}
            >
              Attivo
            </span>
          )}
        </div>
        <dl
          className="text-xs grid grid-cols-3 gap-x-3"
          style={{ color: t.textSecondary }}
        >
          <div>
            <dt className="text-[10px] uppercase tracking-wider opacity-70">
              Colaz.
            </dt>
            <dd className="font-mono tabular-nums">{profilo.ora_colazione}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider opacity-70">
              Pranzo
            </dt>
            <dd className="font-mono tabular-nums">{profilo.ora_pranzo}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider opacity-70">
              Cena
            </dt>
            <dd className="font-mono tabular-nums">{profilo.ora_cena}</dd>
          </div>
        </dl>
      </button>
    </li>
  );
}

// ============================================================
// ProfiloDrawer — bottom-sheet full-height, form 6 campi.
// ============================================================
//
// Initialisation: in edit mode reads the profilo via
// selectProfiloById at mount; fields are captured in `initial`
// via useMemo and used both for initial state and for the
// Annulla restore. Re-opening the drawer on a different profilo
// remounts this component (key via editingId differs), so initial
// is always fresh — no useEffect sync needed.
//
// Validation:
//   - Salva disabled if !dirty or any field empty.
//   - Soft monotonic ordering warning (sveglia < colazione 
//     pranzo < cena) shown inline but non-blocking.
//   - Duplicate name not enforced (AMB-8b.B).

function ProfiloDrawer({ mode, editingId, onClose, setDirty, triggerRef, theme: t }) {
  const { state, actions } = useAppContext();
  const titleId = useId();
  const warningId = useId();

  const initial = useMemo(() => {
    if (mode === 'edit' && editingId != null) {
      const p = selectProfiloById(state, editingId);
      if (p) {
        return {
          nome_profilo: p.nome_profilo ?? '',
          ora_sveglia: p.ora_sveglia ?? '',
          ora_colazione: p.ora_colazione ?? '',
          ora_pranzo: p.ora_pranzo ?? '',
          ora_cena: p.ora_cena ?? '',
          ora_sonno: p.ora_sonno ?? '',
        };
      }
    }
    return { ...EMPTY_FORM };
    // mode and editingId are stable for the life of this drawer instance
    // (drawer remounts on open). `state` snapshot at mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(initial);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // 8d-B CP2 (§6.105): ref to the Elimina button so ConfirmModal restores
  // focus there on dismiss (Annulla / Escape / backdrop). Without this
  // ref, useModalA11y falls back to document.body — observed regression
  // in CP7 browser check 8d-A-continue-2 Punto 1.
  const deleteTriggerRef = useRef(null);

  const profiloAttuale =
    mode === 'edit' && editingId != null
      ? selectProfiloById(state, editingId)
      : null;
  const isProfiloAttivo = profiloAttuale?.attivo === 1;

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setDirty(true);
  }

  function handleAnnulla() {
    // Silent restore + close. No confirm: the cross-tab guard in
    // ConfigView covers accidental data loss via tab switch.
    setForm(initial);
    onClose();
  }

  async function handleSalva() {
    const result =
      mode === 'create'
        ? await actions.addProfilo(form)
        : await actions.updateProfilo(editingId, form);
    // On failure the thunk dispatched SET_ERROR; the drawer stays open
    // so the user can retry or Annulla without losing typed data.
    if (result?.ok) onClose();
  }

  const allFilled =
    form.nome_profilo.trim().length > 0 &&
    form.ora_sveglia.length > 0 &&
    form.ora_colazione.length > 0 &&
    form.ora_pranzo.length > 0 &&
    form.ora_cena.length > 0 &&
    form.ora_sonno.length > 0;

  // Dirty read via closure on useState form vs initial is cheaper
  // than lifting dirty state here — Salva gate uses a simple
  // deepEqual check.
  const isDirty = useMemo(() => {
    return (
      form.nome_profilo !== initial.nome_profilo ||
      form.ora_sveglia !== initial.ora_sveglia ||
      form.ora_colazione !== initial.ora_colazione ||
      form.ora_pranzo !== initial.ora_pranzo ||
      form.ora_cena !== initial.ora_cena ||
      form.ora_sonno !== initial.ora_sonno
    );
  }, [form, initial]);

  const orderWarnings = computeOrderWarnings(form);
  const hasOrderWarning = Object.values(orderWarnings).some(Boolean);

  const canSave = (mode === 'create' || isDirty) && allFilled;

  const { containerRef, modalProps } = useModalA11y({
    isOpen: true,
    onClose: handleAnnulla,
    labelId: titleId,
    describedById: hasOrderWarning ? warningId : undefined,
    triggerRef,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: t.modalOverlay }}
      onClick={(e) => {
        // §6.86 (superseded .1 by .4): drawer is modal-first. The backdrop
        // `fixed inset-0 z-50` covers the tab bar too, so ConfigView's
        // cross-tab guard does not trigger from inside an open drawer —
        // by design. Users must resolve dirty via Annulla/Salva first.
        // Backdrop-click then closes on non-dirty state (convenience
        // affordance) and is a no-op on dirty (anti-accidental-dismiss).
        if (e.target === e.currentTarget && !isDirty) handleAnnulla();
      }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        data-testid="profilo-drawer"
        className="w-full max-w-md rounded-t-2xl p-5 pb-8 flex flex-col gap-3 max-h-[92vh] overflow-y-auto"
        style={{ background: t.modalBg }}
      >
        <h3
          id={titleId}
          className="font-bold text-base"
          style={{ color: t.textPrimary }}
        >
          {mode === 'create' ? 'Nuovo profilo' : 'Modifica profilo'}
        </h3>

        <FormField
          id="profilo-nome"
          label="Nome profilo"
          value={form.nome_profilo}
          onChange={(v) => updateField('nome_profilo', v)}
          type="text"
          theme={t}
        />

        <FormField
          id="profilo-sveglia"
          label="Sveglia"
          value={form.ora_sveglia}
          onChange={(v) => updateField('ora_sveglia', v)}
          type="time"
          theme={t}
        />

        <FormField
          id="profilo-colazione"
          label="Colazione"
          value={form.ora_colazione}
          onChange={(v) => updateField('ora_colazione', v)}
          type="time"
          theme={t}
          warning={
            orderWarnings.colazione
              ? 'Deve essere dopo la sveglia'
              : null
          }
        />

        <FormField
          id="profilo-pranzo"
          label="Pranzo"
          value={form.ora_pranzo}
          onChange={(v) => updateField('ora_pranzo', v)}
          type="time"
          theme={t}
          warning={
            orderWarnings.pranzo
              ? 'Deve essere dopo la colazione'
              : null
          }
        />

        <FormField
          id="profilo-cena"
          label="Cena"
          value={form.ora_cena}
          onChange={(v) => updateField('ora_cena', v)}
          type="time"
          theme={t}
          warning={
            orderWarnings.cena
              ? 'Deve essere dopo il pranzo'
              : null
          }
        />

        <FormField
          id="profilo-sonno"
          label="Sonno"
          value={form.ora_sonno}
          onChange={(v) => updateField('ora_sonno', v)}
          type="time"
          theme={t}
        />

        {hasOrderWarning && (
          <p
            id={warningId}
            className="sr-only"
            role="status"
          >
            Alcuni orari non rispettano l&apos;ordine atteso sveglia - colazione - pranzo - cena.
          </p>
        )}

        <footer className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAnnulla}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border"
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
              disabled={!canSave}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{
                background: t.blue,
                color: '#fff',
              }}
            >
              Salva
            </button>
          </div>

          {mode === 'edit' && (
            <div className="flex gap-2">
              {!isProfiloAttivo && (
                <button
                  type="button"
                  onClick={async () => {
                    const result = await actions.attivaProfilo(editingId);
                    if (result?.ok) onClose();
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border"
                  style={{
                    background: t.modalBg,
                    color: t.green,
                    borderColor: t.green,
                  }}
                >
                  Attiva
                </button>
              )}
              {/* §6.86.2: span wrapper exposes tooltip when button is disabled.
                  HTML sopprime title su <button disabled>; il parent <span> riceve
                  hover events e rende il tooltip nativo. Mantiene semantica a11y
                  (button resta disabled) senza componenti tooltip custom. */}
              <span
                className="flex-1"
                title={
                  isProfiloAttivo
                    ? 'Non puoi eliminare il profilo attivo. Attiva un altro profilo prima.'
                    : undefined
                }
              >
                <button
                  ref={deleteTriggerRef}
                  type="button"
                  disabled={isProfiloAttivo}
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{
                    background: t.modalBg,
                    color: t.red,
                    borderColor: t.red,
                  }}
                >
                  Elimina
                </button>
              </span>
            </div>
          )}
        </footer>

        {/* §6.89 (CP5 Sessione 8d-A-continue): retrofit
            ConfirmDeleteProfiloModal inline → ConfirmModal shared
            (src/components/shared/ConfirmModal.jsx created in 8c-2 CP5).
            Copy preserved 1:1 from predecessor. §6.92 auto-resolved:
            shared modal mounts useModalA11y (focus-trap + Escape-to-close
            + restore-focus), which the inline predecessor lacked. */}
        <ConfirmModal
          open={deleteConfirmOpen}
          triggerRef={deleteTriggerRef}
          title="Elimina profilo?"
          body={
            <p>
              Questa azione non può essere annullata.{' '}
              <strong>{profiloAttuale?.nome_profilo ?? ''}</strong> verrà rimosso.
            </p>
          }
          confirmLabel="Elimina profilo"
          danger={true}
          onConfirm={async () => {
            const result = await actions.deleteProfilo(editingId);
            setDeleteConfirmOpen(false);
            if (result?.ok) onClose();
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
}

// ============================================================
// FormField — shared field with optional inline warning.
// ============================================================
//
// Warning: role="status" (not "alert") because monotonic order
// violations are non-blocker per AMB-8b.B. Placed directly under
// the input to anchor feedback spatially (proximity heuristic).

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
        required
        className="rounded px-3 py-2 border"
        style={{
          background: t.modalBg,
          color: t.textPrimary,
          borderColor: t.tapBd,
        }}
      />
      {warning && (
        <p
          className="text-xs"
          role="status"
          style={{ color: t.red }}
        >
          {warning}
        </p>
      )}
    </div>
  );
}

// ============================================================
// computeOrderWarnings — pure helper.
// ============================================================
//
// Returns an object with boolean flags for each non-sleep anchor
// violating the strict monotonic rule sveglia < colazione 
// pranzo < cena. Empty fields are treated as "no opinion yet"
// and do not raise warnings (prevents noise during initial
// typing). ora_sonno is deliberately excluded — see AMB-8b.B
// Nottambulo 02:00 wrap-midnight case.

function computeOrderWarnings(form) {
  const toMin = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const s = toMin(form.ora_sveglia);
  const c = toMin(form.ora_colazione);
  const p = toMin(form.ora_pranzo);
  const e = toMin(form.ora_cena);

  return {
    colazione: s !== null && c !== null && c <= s,
    pranzo: c !== null && p !== null && p <= c,
    cena: p !== null && e !== null && e <= p,
  };
}
