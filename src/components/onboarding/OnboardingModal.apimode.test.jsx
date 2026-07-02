// ============================================================
// OnboardingModal apiMode tests — BUG-m fix (s.6.251, par.22.193).
// In API-mode the demo seed would write 3 real farmaci to the backend
// (production): the card must be disabled even at farmaci-zero.
// Harness mirrors OnboardingModal.test.jsx (useTheme mocked).
// SENTINEL_BUGM_S6251_TEST_APIMODE
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingModal from './OnboardingModal.jsx';

vi.mock('../../hooks/useTheme.js', () => ({
  useTheme: () => ({
    tokens: {
      modalOverlay: 'rgba(0,0,0,0.5)',
      modalBg: '#ffffff',
      textPrimary: '#000000',
    },
  }),
}));

async function goToStep2(user) {
  await user.type(screen.getByLabelText('Come ti chiami?'), 'Roberto');
  await user.click(screen.getByRole('button', { name: 'Avanti' }));
}

describe('OnboardingModal apiMode (BUG-m s.6.251)', () => {
  it('apiMode=true: demo card disabled even at farmaci-zero', async () => {
    const user = userEvent.setup();
    render(
      <OnboardingModal
        open={true}
        apiMode={true}
        farmaciAttiviCount={0}
        onComplete={() => {}}
      />
    );
    await goToStep2(user);
    expect(screen.getByTestId('onboarding-card-demo')).toBeDisabled();
  });

  it('default apiMode=false: demo card enabled at farmaci-zero (regression)', async () => {
    const user = userEvent.setup();
    render(
      <OnboardingModal
        open={true}
        farmaciAttiviCount={0}
        onComplete={() => {}}
      />
    );
    await goToStep2(user);
    expect(screen.getByTestId('onboarding-card-demo')).toBeEnabled();
  });
});
