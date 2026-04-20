// SaltataModal — 5 unit tests (AMB-7c-1.N).
// Covers: mount gate, confermo saltata (pure close), cambia in sospesa,
// correggi a presa via timepick, overlay + header close.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
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
});
