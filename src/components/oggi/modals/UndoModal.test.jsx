// UndoModal — 4 unit tests (Sessione 7d-2 CP5, §6.41 + §6.59).
// Covers: mount-gate, a11y focus trap, success path (confirm + close),
// downstream-user-edits banner (no close).
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProvider, buildTestPlan } from '../../../test/renderHelpers.jsx';
import { UndoModal } from './UndoModal.jsx';

const plan = buildTestPlan();
// plan[2] = stato 'presa', ora_effettiva '2026-04-19T23:55:00', dateStr '2026-04-19'
const PRESA_ENTRY = plan[2];

function renderModal(overrides = {}) {
  const props = {
    entry: PRESA_ENTRY,
    onConfirm: vi.fn().mockResolvedValue({ ok: true }),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<UndoModal {...props} />);
  return { ...utils, props };
}

describe('UndoModal', () => {
  it('does not mount when entry is null', () => {
    const { queryByTestId } = renderWithProvider(
      <UndoModal
        entry={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(queryByTestId('undo-modal')).toBeNull();
  });

  it('a11y: initial focus lands inside the dialog container', async () => {
    renderModal();
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('calls onConfirm(entry) then onClose on success path', async () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Annulla assunzione/i }));
    await waitFor(() => {
      expect(props.onConfirm).toHaveBeenCalledTimes(1);
    });
    expect(props.onConfirm).toHaveBeenCalledWith(PRESA_ENTRY);
    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows DOWNSTREAM_USER_EDITS banner and does NOT call onClose when thunk rejects', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: false, code: 'DOWNSTREAM_USER_EDITS' });
    const { props } = renderModal({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /Annulla assunzione/i }));
    await waitFor(() => {
      expect(screen.getByTestId('undo-banner-downstream')).toBeInTheDocument();
    });
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
