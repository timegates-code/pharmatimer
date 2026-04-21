// @vitest-environment jsdom
//
// Unit tests for useModalA11y (AMB-7d-1.C/D/F).
// 4 tests required by AMB-7d-1.K breakdown:
//   1. mount activation: focus enters the container
//   2. Escape → onClose (escapeDeactivates path)
//   3. restore focus manuale: triggerRef.current receives focus on deactivate
//   4. restore auto-fallback: no triggerRef + entry-key not in DOM → document.body

import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useModalA11y } from './useModalA11y.js';

// Minimal test harness: renders a modal-like container that uses the hook.
function Modal({ isOpen, onClose, triggerRef, fallbackEntryKey }) {
  const { containerRef, modalProps } = useModalA11y({
    isOpen,
    onClose,
    labelId: 'test-label',
    triggerRef: triggerRef ?? null,
    fallbackEntryKey: fallbackEntryKey ?? null,
  });
  if (!isOpen) return null;
  return (
    <div ref={containerRef} {...modalProps} data-testid="modal">
      <h2 id="test-label">Title</h2>
      <button data-testid="btn-a">A</button>
      <button data-testid="btn-b">B</button>
    </div>
  );
}

describe('useModalA11y', () => {
  it('mount activation: when isOpen=true focus enters the container', async () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const modal = screen.getByTestId('modal');
      expect(modal.contains(document.activeElement)).toBe(true);
    });
  });

  it('Escape triggers onClose via escapeDeactivates', async () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('modal').contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('manual restore: on deactivate, focus returns to triggerRef.current', async () => {
    function Wrap() {
      const triggerRef = useRef(null);
      const [open, setOpen] = useState(true);
      return (
        <>
          <button ref={triggerRef} data-testid="trigger">Open</button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        </>
      );
    }

    render(<Wrap />);

    await waitFor(() => {
      expect(screen.getByTestId('modal').contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('trigger'));
    });
  });

  it('auto-open fallback: triggerRef=null + missing entry-key → focus on body', async () => {
    function Wrap() {
      const [open, setOpen] = useState(true);
      return (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          triggerRef={null}
          fallbackEntryKey="nonexistent-entry-key"
        />
      );
    }

    render(<Wrap />);

    await waitFor(() => {
      expect(screen.getByTestId('modal').contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    await waitFor(() => {
      expect(document.activeElement).toBe(document.body);
    });
  });
});
