// SospesaModal — 5 unit tests (7c-1: 3, 7d-1: +2 a11y smoke).
// Covers: mount gate, ripristina dispatch + close, overlay + header close,
// a11y focus mount activation, a11y Escape.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../../test/renderHelpers.jsx';
import { SospesaModal } from './SospesaModal.jsx';

const TODAY = '2026-04-19';
const basePlan = buildTestPlan({ dateStr: TODAY });
const SOSPESA_ENTRY = { ...basePlan[0], stato: 'sospesa' };

function renderModal(overrides = {}) {
  const props = {
    entry: SOSPESA_ENTRY,
    onRipristina: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<SospesaModal {...props} />);
  return { ...utils, props };
}

describe('SospesaModal', () => {
  it('does not mount when entry is null', () => {
    const { queryByTestId } = renderWithProvider(
      <SospesaModal entry={null} onRipristina={vi.fn()} onClose={vi.fn()} />
    );
    expect(queryByTestId('sospesa-modal')).toBeNull();
  });

  it('"Ripristina" dispatches onRipristina(entry) + onClose', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Ripristina come da prendere/i }));
    expect(props.onRipristina).toHaveBeenCalledTimes(1);
    expect(props.onRipristina).toHaveBeenCalledWith(SOSPESA_ENTRY);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click and on close-button click', () => {
    const first = renderModal();
    fireEvent.click(first.getByTestId('sospesa-modal'));
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });

  // --- 7d-1 a11y smoke tests (AMB-7d-1.K) ---

  it('a11y: initial focus lands inside the dialog container', async () => {
    renderModal();
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('a11y: Escape triggers onClose via focus trap', async () => {
    const { props } = renderModal();
    await waitFor(() => {
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    });
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
