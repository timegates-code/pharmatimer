// ============================================================
// OnboardingModal unit tests — Sessione v3.0.0 Step 1 CP1.
// ============================================================
// 5 tests covering Q-UX.1/1.e/2 (§22.41) and sub-AMB 10.b (§22.43):
//   1. Step 1 render base + Avanti enabled after typing
//   2. Step 1 -> Step 2 transition (greeting + cards visible)
//   3. Step 2 -> Step 1 indietro preserves nome
//   4. Step 2 selection + Inizia calls onComplete with empty mode
//   5. Sub-AMB 10.b: demo card disabled when farmaciAttiviCount > 0
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingModal from './OnboardingModal.jsx';

// Mock useTheme to provide a stable token shape (avoid AppContext setup
// in unit tests). Only the tokens actually consumed by OnboardingModal
// are surfaced here.
vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    tokens: {
      modalOverlay: 'rgba(0,0,0,0.5)',
      modalBg: '#ffffff',
      textPrimary: '#000000',
    },
  }),
}));

describe('OnboardingModal', () => {
  it('Step 1: render base + Avanti enabled after typing', async () => {
    const user = userEvent.setup();
    render(<OnboardingModal open={true} onComplete={() => {}} />);

    // Header + progress indicator
    expect(screen.getByText('Ciao 👋')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Avanti starts disabled (empty trim)
    const avanti = screen.getByRole('button', { name: 'Avanti' });
    expect(avanti).toBeDisabled();

    // Typing nome enables Avanti
    const input = screen.getByLabelText('Come ti chiami?');
    await user.type(input, 'Roberto');

    expect(avanti).toBeEnabled();
  });

  it('Step 1 -> Step 2 transition: greeting personalized + cards visible', async () => {
    const user = userEvent.setup();
    render(<OnboardingModal open={true} onComplete={() => {}} />);

    await user.type(screen.getByLabelText('Come ti chiami?'), 'Roberto');
    await user.click(screen.getByRole('button', { name: 'Avanti' }));

    // Personalized greeting
    expect(
      screen.getByText(/Ciao Roberto! Come vuoi iniziare\?/)
    ).toBeInTheDocument();
    // Progress advanced
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    // Both cards rendered
    expect(screen.getByTestId('onboarding-card-empty')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-card-demo')).toBeInTheDocument();
    // Inizia disabled until selection
    expect(screen.getByRole('button', { name: 'Inizia' })).toBeDisabled();
  });

  it('Step 2 -> Step 1 indietro preserves nome value', async () => {
    const user = userEvent.setup();
    render(<OnboardingModal open={true} onComplete={() => {}} />);

    await user.type(screen.getByLabelText('Come ti chiami?'), 'Roberto');
    await user.click(screen.getByRole('button', { name: 'Avanti' }));
    await user.click(screen.getByRole('button', { name: /Indietro/ }));

    // Back on step 1 with nome preserved
    const input = screen.getByLabelText('Come ti chiami?');
    expect(input).toHaveValue('Roberto');
  });

  it('Step 2 selection + Inizia: onComplete called with empty mode', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingModal open={true} onComplete={onComplete} />);

    await user.type(screen.getByLabelText('Come ti chiami?'), 'Roberto');
    await user.click(screen.getByRole('button', { name: 'Avanti' }));
    await user.click(screen.getByTestId('onboarding-card-empty'));

    const inizia = screen.getByRole('button', { name: 'Inizia' });
    expect(inizia).toBeEnabled();

    await user.click(inizia);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      nome: 'Roberto',
      mode: 'empty',
    });
  });

  it('Sub-AMB 10.b: demo card disabled when farmaciAttiviCount > 0', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <OnboardingModal
        open={true}
        defaultNome="Mario"
        farmaciAttiviCount={2}
        onComplete={onComplete}
      />
    );

    // defaultNome pre-populates -> Avanti immediately enabled
    await user.click(screen.getByRole('button', { name: 'Avanti' }));

    // Demo card disabled with proper a11y attributes + tooltip
    const demoCard = screen.getByTestId('onboarding-card-demo');
    expect(demoCard).toBeDisabled();
    expect(demoCard).toHaveAttribute('aria-disabled', 'true');
    expect(demoCard).toHaveAttribute('title', 'Hai già farmaci configurati');

    // Click on disabled demo is no-op: Inizia stays disabled
    await user.click(demoCard);
    expect(screen.getByRole('button', { name: 'Inizia' })).toBeDisabled();

    // Empty card still works: completes with mode='empty'
    await user.click(screen.getByTestId('onboarding-card-empty'));
    await user.click(screen.getByRole('button', { name: 'Inizia' }));

    expect(onComplete).toHaveBeenCalledWith({ nome: 'Mario', mode: 'empty' });
  });
});
