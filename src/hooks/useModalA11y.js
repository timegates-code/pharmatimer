// React hook for modal accessibility: focus trap + Escape-to-close + restore focus.
//
// Contract (AMB-7d-1.C, extended with fallbackEntryKey — see §11 decision log):
//
//   useModalA11y({
//     isOpen,            // bool: gate the trap activation
//     onClose,           // () => void: called when trap deactivates (Escape included)
//     labelId,           // id of the title element inside the modal (aria-labelledby)
//     describedById,     // optional: id of a description element (aria-describedby)
//     triggerRef,        // optional: ref to the element that opened the modal (manual opens)
//     fallbackEntryKey,  // optional: entry.key used to locate the originating card
//                        //           for auto-opened modals (RecuperoModal auto-prompt)
//   })
//     => { containerRef, modalProps }
//
// Restore-focus chain at deactivate (AMB-7d-1.D, clarified):
//   triggerRef?.current  →  document.querySelector('[data-entry-key="<key>"]')  →  document.body
//
// Notes:
// - Uses focus-trap (transitive dep of focus-trap-react) directly for a hook-
//   shaped API. AMB-7d-1.B scartava "custom" per test-surface: focus-trap is
//   battle-tested and the same engine that powers focus-trap-react.
// - escapeDeactivates: true → Escape triggers onDeactivate → onClose (AMB-7d-1.F,
//   no custom document-level keydown listener).
// - tabbableOptions.displayCheck: 'none' sidesteps jsdom visibility shortcomings
//   and is safe at runtime because focusable descendants of a mounted modal
//   are intentionally visible.

import { useRef, useEffect, useMemo } from 'react';
import { createFocusTrap } from 'focus-trap';

export function useModalA11y({
  isOpen,
  onClose,
  labelId,
  describedById,
  triggerRef = null,
  fallbackEntryKey = null,
}) {
  const containerRef = useRef(null);

  // Mirror latest values so the trap's onDeactivate closure stays current
  // without forcing re-activation when props change mid-open.
  const latestRef = useRef({ onClose, triggerRef, fallbackEntryKey });
  latestRef.current = { onClose, triggerRef, fallbackEntryKey };

  useEffect(() => {
    if (!isOpen) return undefined;
    const node = containerRef.current;
    if (!node) return undefined;

    const trap = createFocusTrap(node, {
      escapeDeactivates: true,
      clickOutsideDeactivates: false,
      // Allow outside clicks to propagate (default is false: focus-trap
      // would stopPropagation/preventDefault on overlay clicks, killing
      // the `onClick` handler that each modal uses to close on overlay tap).
      // The trap stays active until the parent unmounts the modal after onClose.
      allowOutsideClick: true,
      returnFocusOnDeactivate: false, // we manage restore ourselves
      tabbableOptions: { displayCheck: 'none' },
      onDeactivate: () => {
        const { onClose: cb, triggerRef: tRef, fallbackEntryKey: key } = latestRef.current;

        let target = tRef?.current ?? null;
        if (!target && key) {
          target = document.querySelector(`[data-entry-key="${key}"]`);
        }
        if (!target) target = document.body;

        try {
          if (typeof target.focus === 'function') target.focus();
        } catch (_) {
          /* ignore focus restoration errors (detached nodes, etc.) */
        }

        if (typeof cb === 'function') cb();
      },
    });

    try {
      trap.activate();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useModalA11y] trap.activate failed', err);
      return undefined;
    }

    return () => {
      // Suppress onDeactivate on unmount-driven teardown to avoid double-firing
      // onClose (the parent has already decided to close).
      try {
        trap.deactivate({ onDeactivate: false, returnFocus: false });
      } catch (_) {
        /* ignore teardown errors */
      }
    };
  }, [isOpen]);

  const modalProps = useMemo(
    () => ({
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': labelId,
      ...(describedById ? { 'aria-describedby': describedById } : {}),
    }),
    [labelId, describedById]
  );

  return { containerRef, modalProps };
}
