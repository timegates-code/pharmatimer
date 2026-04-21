// RecuperoModal — 8 unit tests (7c-1: 6, 7d-1: +2 a11y smoke).
// Covers: mount gate, slider → rec-value update, apply dispatch (entry, rec),
// reset button visibility + reset via onReset(entry), primary button disabled
// at rec=0 when no existing recupero, overlay + close, a11y focus mount
// activation, a11y Escape.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../../test/renderHelpers.jsx';
import { RecuperoModal } from './RecuperoModal.jsx';

const TODAY = '2026-04-19';
const basePlan = buildTestPlan({ dateStr: TODAY });
// Entry 1 is 'ricalcolata' with gap_minuti=30 (see buildTestPlan factory).
const RICALC_ENTRY = basePlan[1];

function renderModal(overrides = {}) {
  const props = {
    entry: RICALC_ENTRY,
    onApply: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<RecuperoModal {...props} />);
  return { ...utils, props };
}

describe('RecuperoModal', () => {
  it('does not mount when entry is null', () => {
    const { queryByTestId } = renderWithProvider(
      <RecuperoModal entry={null} onApply={vi.fn()} onReset={vi.fn()} onClose={vi.fn()} />
    );
    expect(queryByTestId('recupero-modal')).toBeNull();
  });

  it('slider updates the displayed rec value', () => {
    renderModal();
    const slider = screen.getByLabelText('Minuti da recuperare');
    // Default rec = entry.recupero_minuti = 0.
    expect(screen.getByTestId('rec-value')).toHaveTextContent('0 min');
    // Move slider to 15 min.
    fireEvent.change(slider, { target: { value: '15' } });
    expect(screen.getByTestId('rec-value')).toHaveTextContent('15 min');
  });

  it('primary button dispatches onApply(entry, rec) + onClose', () => {
    const { props } = renderModal();
    const slider = screen.getByLabelText('Minuti da recuperare');
    fireEvent.change(slider, { target: { value: '20' } });
    // Primary button label becomes "Anticipa di 20 min".
    fireEvent.click(screen.getByRole('button', { name: /Anticipa di 20 min/i }));
    expect(props.onApply).toHaveBeenCalledTimes(1);
    expect(props.onApply).toHaveBeenCalledWith(RICALC_ENTRY, 20);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('primary button is disabled at rec=0 when no pre-existing recupero', () => {
    renderModal();
    const primary = screen.getByRole('button', { name: /Seleziona tempo/i });
    expect(primary).toBeDisabled();
  });

  it('Ripristina button shows only with pre-existing recupero and calls onReset(entry) + onClose', () => {
    // Without pre-existing: absent.
    const { queryByRole, unmount } = renderModal();
    expect(queryByRole('button', { name: 'Ripristina' })).toBeNull();
    unmount();

    // With pre-existing: present, dispatch on tap.
    const entryWithRec = {
      ...RICALC_ENTRY,
      recupero_minuti: 15,
      ora_ricalcolata_originale: '16:30',
      ora_ricalcolata: '16:15',
    };
    const { props } = renderModal({ entry: entryWithRec });
    fireEvent.click(screen.getByRole('button', { name: 'Ripristina' }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
    expect(props.onReset).toHaveBeenCalledWith(entryWithRec);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click and on close-button click', () => {
    const first = renderModal();
    fireEvent.click(first.getByTestId('recupero-modal'));
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
