// SospesaModal — 3 unit tests (AMB-7c-1.N).
// Covers: mount gate, ripristina dispatch + close, overlay + header close.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
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
});
