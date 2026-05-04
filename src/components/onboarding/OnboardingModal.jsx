// ============================================================
// OnboardingModal — 2-step welcome modal (Sessione v3.0.0 Step 1 CP1).
// ============================================================
//
// Triggered by AppProvider gating logic (CP2) when
// state.impostazioni.onboarding_completed is not set. Captures user
// nome (step 1) and start mode (step 2: empty vs demo seed).
//
// Sub-AMB §22.43 / Q-UX.1.e (focus-trap, no Escape, no skip):
//   useModalA11y wired with escapeDeactivates=false (CP1 hook
//   extension §6.164).
//
// Sub-AMB §22.43 / 10.b (DB già popolato):
//   Card "demo" disabled when farmaciAttiviCount > 0 (preserves user
//   data; visible+tooltipped instead of hidden — UX-symmetric, more
//   informative for migrated users).
//
// Q-UX.3 default (migration users): defaultNome pre-populates the
//   nome input (e.g. existing state.impostazioni.nome_utente) so the
//   user can confirm/modify rather than re-type.
//
// API props:
//   open                  boolean — visibility gate (null-render when false)
//   defaultNome           string  — pre-populate nome input; default ''
//   farmaciAttiviCount    number  — count of state.farmaci (post-filter);
//                                   >0 disables the demo card (sub-AMB 10.b)
//   onComplete            ({nome, mode}) => void — called on "Inizia";
//                                                  mode ∈ {'empty','demo'}
// ============================================================

import { useState, useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { useModalA11y } from '../../hooks/useModalA11y.js';

export default function OnboardingModal({
  open,
  defaultNome = '',
  farmaciAttiviCount = 0,
  onComplete,
}) {
  const { tokens: t } = useTheme();
  const titleId = useId();

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState(defaultNome);
  const [selectedMode, setSelectedMode] = useState(null);

  // Hook wired with escapeDeactivates=false (no-skip onboarding,
  // §22.41 sub-AMB 1.e). onClose is a no-op: trap activation requires
  // a callback even when never invoked (Escape suppressed by hook).
  const { containerRef, modalProps } = useModalA11y({
    isOpen: open,
    onClose: () => {},
    labelId: titleId,
    escapeDeactivates: false,
  });

  if (!open) return null;

  const trimmed = nome.trim();
  const canAdvance = trimmed.length > 0;
  const demoDisabled = farmaciAttiviCount > 0;

  const handleAvanti = () => {
    if (canAdvance) setStep(2);
  };

  const handleIndietro = () => setStep(1);

  const handleSelectCard = (mode) => {
    if (mode === 'demo' && demoDisabled) return;
    setSelectedMode(mode);
  };

  const handleInizia = () => {
    if (!selectedMode) return;
    if (selectedMode === 'demo' && demoDisabled) return;
    onComplete({ nome: trimmed, mode: selectedMode });
  };

  return (
    <div
      role="presentation"
      data-testid="onboarding-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: t.modalOverlay }}
    >
      <div
        ref={containerRef}
        {...modalProps}
        className="max-w-md w-full rounded-lg p-6 shadow-lg"
        style={{ background: t.modalBg, color: t.textPrimary }}
      >
        {/* Progress indicator top-right (Q-UX.1.c §22.41) */}
        <div className="flex justify-end mb-2">
          <span className="text-sm opacity-60">{step} / 2</span>
        </div>

        {step === 1 && (
          <div data-testid="onboarding-step-1">
            <h2 id={titleId} className="text-2xl font-semibold mb-2">
              Ciao 👋
            </h2>
            <p className="text-sm opacity-80 mb-6">
              PharmaTimer ti ricorda ogni dose della tua terapia quotidiana.
            </p>

            <label
              htmlFor="onboarding-nome"
              className="block text-sm font-medium mb-2"
            >
              Come ti chiami?
            </label>
            <input
              id="onboarding-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Il tuo nome"
              className="w-full px-3 py-2 rounded border border-zinc-400 bg-transparent mb-6"
              style={{ color: t.textPrimary }}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAvanti}
                disabled={!canAdvance}
                className="px-4 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avanti
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div data-testid="onboarding-step-2">
            <h2 id={titleId} className="text-2xl font-semibold mb-6">
              Ciao {trimmed}! Come vuoi iniziare?
            </h2>

            {/* Card 1 — primaria (sempre attiva) */}
            <button
              type="button"
              onClick={() => handleSelectCard('empty')}
              data-testid="onboarding-card-empty"
              aria-pressed={selectedMode === 'empty'}
              className={`w-full text-left p-4 rounded-lg border-2 mb-3 transition-colors ${
                selectedMode === 'empty'
                  ? 'border-blue-600'
                  : 'border-zinc-400 hover:border-zinc-500'
              }`}
              style={{ color: t.textPrimary }}
            >
              <div className="font-semibold mb-1">Aggiungo i miei farmaci</div>
              <div className="text-sm opacity-80">
                Parto da un'app vuota e configuro la terapia adesso.
              </div>
            </button>

            {/* Card 2 — secondaria, disabled se DB popolato (sub-AMB 10.b) */}
            <button
              type="button"
              onClick={() => handleSelectCard('demo')}
              disabled={demoDisabled}
              data-testid="onboarding-card-demo"
              aria-pressed={selectedMode === 'demo'}
              aria-disabled={demoDisabled}
              title={demoDisabled ? 'Hai già farmaci configurati' : undefined}
              className={`w-full text-left p-4 rounded-lg border-2 mb-6 transition-colors ${
                selectedMode === 'demo'
                  ? 'border-blue-600'
                  : 'border-zinc-400 hover:border-zinc-500'
              } ${demoDisabled ? 'opacity-50 cursor-not-allowed hover:border-zinc-400' : ''}`}
              style={{ color: t.textPrimary }}
            >
              <div className="font-semibold mb-1">Mostrami un esempio</div>
              <div className="text-sm opacity-80">
                Carico 3 farmaci di esempio. Posso cancellarli quando voglio.
              </div>
            </button>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleIndietro}
                className="px-4 py-2 rounded font-medium border border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                style={{ color: t.textPrimary }}
              >
                ← Indietro
              </button>
              <button
                type="button"
                onClick={handleInizia}
                disabled={!selectedMode || (selectedMode === 'demo' && demoDisabled)}
                className="px-4 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Inizia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
