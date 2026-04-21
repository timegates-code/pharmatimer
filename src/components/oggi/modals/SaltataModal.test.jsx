// SaltataModal — 7 unit tests (7c-1: 5, 7d-1: +2 a11y smoke).
// Covers: mount gate, confermo saltata (pure close), cambia in sospesa,
// correggi a presa via timepick, overlay + header close, a11y focus
// mount activation, a11y Escape.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../../test/renderHelpers.jsx';
import { SaltataModal } from './SaltataModal.jsx';

const TODAY = '2026-04-19';
const basePlan = buildTestPlan({ dateStr: TODAY });
// Promote first entry to 'saltata' for these tests.
const SALTATA_ENTRY = { ...basePlan[0], stato: 'saltata' };

function renderModal(overrides = {}) {
  const props = {
    entry: SALTATA_ENTRY,
    todayStr: TODAY,
    onCambiaInSospesa: vi.fn(),
    onSetTime: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<SaltataModal {...props} />);
  return { ...utils, props };
}

describe('SaltataModal', () => {
  it('does not mount when entry is null', () => {
    const { queryByTestId } = renderWithProvider(
      <SaltataModal
        entry={null}
        todayStr={TODAY}
        onCambiaInSospesa={vi.fn()}
        onSetTime={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(queryByTestId('saltata-modal')).toBeNull();
  });

  it('"Confermo saltata" only calls onClose (no other handler)', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Confermo saltata/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCambiaInSospesa).not.toHaveBeenCalled();
    expect(props.onSetTime).not.toHaveBeenCalled();
  });

  it('"Cambia in sospesa" dispatches onCambiaInSospesa(entry) + onClose', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Cambia in sospesa/i }));
    expect(props.onCambiaInSospesa).toHaveBeenCalledTimes(1);
    expect(props.onCambiaInSospesa).toHaveBeenCalledWith(SALTATA_ENTRY);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('timepick submode dispatches onSetTime(entry, hhmm) + onClose on confirm', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /L'ho presa alle/i }));
    const timeInput = screen.getByLabelText('Orario di assunzione');
    fireEvent.change(timeInput, { target: { value: '10:42' } });
    fireEvent.click(screen.getByRole('button', { name: /Registra assunzione/i }));
    expect(props.onSetTime).toHaveBeenCalledTimes(1);
    expect(props.onSetTime).toHaveBeenCalledWith(SALTATA_ENTRY, '10:42');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click and on close-button click; cross-day hint visible for yesterday entry in timepick', () => {
    // Overlay close.
    const first = renderModal();
    fireEvent.click(first.getByTestId('saltata-modal'));
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    // Yesterday entry shows the hint only inside timepick submode.
    const yesterdayEntry = { ...SALTATA_ENTRY, dateStr: '2026-04-18' };
    const second = renderModal({ entry: yesterdayEntry });
    expect(screen.queryByTestId('cross-day-hint')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /L'ho presa alle/i }));
    expect(screen.getByTestId('cross-day-hint')).toHaveTextContent('Ieri — 18/04');
    // Header close button.
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
