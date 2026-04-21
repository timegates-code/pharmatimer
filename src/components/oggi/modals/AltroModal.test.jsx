// AltroModal — 8 unit tests (7c-1: 6, 7d-1: +2 a11y smoke).
// Covers: mount-gate, 3 action dispatches, overlay+header close, cross-day hint,
// a11y focus trap mount activation, a11y Escape-to-close.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../../test/renderHelpers.jsx';
import { AltroModal } from './AltroModal.jsx';

const TODAY = '2026-04-19';
const plan = buildTestPlan({ dateStr: TODAY });
const PENDING_ENTRY = plan[0]; // stato 'prevista', ora_prevista 08:00

function renderModal(overrides = {}) {
  const props = {
    entry: PENDING_ENTRY,
    todayStr: TODAY,
    onSaltata: vi.fn(),
    onSospesa: vi.fn(),
    onSetTime: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<AltroModal {...props} />);
  return { ...utils, props };
}

describe('AltroModal', () => {
  it('does not mount when entry is null', () => {
    const { queryByTestId } = renderWithProvider(
      <AltroModal
        entry={null}
        todayStr={TODAY}
        onSaltata={vi.fn()}
        onSospesa={vi.fn()}
        onSetTime={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(queryByTestId('altro-modal')).toBeNull();
  });

  it('dispatches onSaltata(entry) + onClose when "Saltata" is tapped', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Saltata/i }));
    expect(props.onSaltata).toHaveBeenCalledTimes(1);
    expect(props.onSaltata).toHaveBeenCalledWith(PENDING_ENTRY);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('dispatches onSospesa(entry) + onClose when "Sospesa" is tapped', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Sospesa/i }));
    expect(props.onSospesa).toHaveBeenCalledTimes(1);
    expect(props.onSospesa).toHaveBeenCalledWith(PENDING_ENTRY);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('switches to timepick submode and dispatches onSetTime(entry, hhmm) + onClose', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /L.ho presa alle/i }));
    const timeInput = screen.getByLabelText('Orario di assunzione');
    fireEvent.change(timeInput, { target: { value: '09:15' } });
    fireEvent.click(screen.getByRole('button', { name: /Registra assunzione/i }));
    expect(props.onSetTime).toHaveBeenCalledTimes(1);
    expect(props.onSetTime).toHaveBeenCalledWith(PENDING_ENTRY, '09:15');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click and on close-button click', () => {
    // Overlay close on a fresh mount.
    const first = renderModal();
    fireEvent.click(first.getByTestId('altro-modal'));
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    // Header close button on a new mount (fresh Provider wrapper).
    const second = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the cross-day hint only when entry.dateStr != todayStr, in timepick submode', () => {
    // Scenario 1: same-day → no hint in timepick submode.
    const sameDay = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /L.ho presa alle/i }));
    expect(screen.queryByTestId('cross-day-hint')).toBeNull();
    sameDay.unmount();

    // Scenario 2: yesterday → "Ieri — DD/MM" visible in timepick submode only.
    const yesterdayEntry = { ...PENDING_ENTRY, dateStr: '2026-04-18' };
    renderModal({ entry: yesterdayEntry });
    expect(screen.queryByTestId('cross-day-hint')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /L.ho presa alle/i }));
    expect(screen.getByTestId('cross-day-hint')).toHaveTextContent('Ieri — 18/04');
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
