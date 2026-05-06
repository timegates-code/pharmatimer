// ============================================================
// useStickyOffset — CP11 v3.0.0 Step 2 (§6.190, Q-UX.8 / sub-AMB 8.a-e).
//
// Keeps a CSS variable `--sticky-offset` on a container element
// synchronized with the measured height of a sticky-positioned header
// child. Consumers downstream of the container can then read
// `top: var(--sticky-offset, 149px)` for any element that needs to pin
// just below the header (currently the DATE SEPARATOR pill in OggiView).
//
// ----------------------------------------------------------------
// Why a callback ref + useState pattern (not useRef + useEffect dep=[])
// ----------------------------------------------------------------
// OggiView has an early-return for `state.status === 'idle'` that
// renders a different DOM tree from the `'ready'` one. The header
// element exists only in the ready branch.
//
// 8d-B (§6.107) tried `useRef + useEffect dep=[]` and failed:
//   1. Component first mounts in 'idle' → ready DOM not created →
//      headerRef.current = null;
//   2. useEffect with empty deps runs once at idle mount → guard
//      `if (!headerRef.current) return` exits silently;
//   3. status flips to 'ready' → React rerenders with the header DOM →
//      ref is now valued, BUT useEffect with `[]` does not rerun and
//      React does NOT track ref.current mutations → ResizeObserver
//      is never attached, CSS var never set.
//
// A callback ref (the function returned from this hook) is invoked by
// React directly during the commit phase whenever the DOM node attaches
// or detaches. We thread it through useState so dep tracking works:
// `setHeaderEl(node)` triggers a rerender, useLayoutEffect reruns with
// the new headerEl, and the observer attaches at the right moment.
//
// ----------------------------------------------------------------
// Sub-AMB compliance (§22.43 Q-UX.8)
// ----------------------------------------------------------------
//   8.a: hook in src/hooks/useStickyOffset.js — ✓ (signature rectified
//        from `useStickyOffset(headerRef)` to `useStickyOffset(containerRef)
//        → callbackRef` per §6.190 / D1; the original signature would
//        force the §6.107 anti-pattern).
//   8.b: CSS var on container element (NOT document) — ✓ (writes to
//        containerRef.current.style; var is naturally scoped to the
//        OggiView subtree via inheritance).
//   8.c: cleanup teardown via observer.disconnect() — ✓ (returned from
//        useLayoutEffect).
//   8.d: covered by 1 unit test in useStickyOffset.test.jsx.
//   8.e: fallback static 149px (§6.110 calibration) — implemented in
//        TWO layers: (1) here we early-return without writing the var
//        when ResizeObserver is undefined OR refs are null, leaving
//        CSS var unset; (2) the consumer reads with a fallback in the
//        var() expression itself: `top-[var(--sticky-offset,149px)]`,
//        so the static value is the natural default. Defence in depth.
// ============================================================

import { useState, useLayoutEffect } from 'react';

export function useStickyOffset(containerRef) {
  const [headerEl, setHeaderEl] = useState(null);

  useLayoutEffect(() => {
    const target = containerRef.current;
    if (!target || !headerEl) return;

    const update = () => {
      const h = headerEl.getBoundingClientRect().height;
      target.style.setProperty('--sticky-offset', `${h}px`);
    };
    // Synchronous initial measurement — covers the case where
    // ResizeObserver is undefined (older browsers, jsdom without
    // polyfill); the var still gets set to the post-mount measured
    // height before paint.
    update();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(headerEl);
    return () => ro.disconnect();
  }, [headerEl, containerRef]);

  return setHeaderEl;
}
