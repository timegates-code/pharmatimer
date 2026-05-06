// ============================================================
// useStickyOffset.test.jsx — CP11 v3.0.0 Step 2 (§6.190 / sub-AMB 8.d).
//
// Single unit test: after the test component mounts, the container
// element has its `--sticky-offset` CSS variable set to a value derived
// from the header's measured height.
//
// Test pattern: we override Element.prototype.getBoundingClientRect at
// the test level so the synthetic <header> reports a deterministic
// height (156px, distinct from the §6.110 fallback 149px so the
// assertion proves the dynamic measurement actually fired). The
// ResizeObserver mock is not strictly needed — the hook's synchronous
// `update()` call inside useLayoutEffect sets the var before the
// observer ever runs — but we install a no-op stub anyway so the
// `new ResizeObserver(update)` constructor doesn't throw in jsdom
// environments where the polyfill might be absent.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useStickyOffset } from './useStickyOffset.js';

function TestComp() {
  const containerRef = useRef(null);
  const setHeaderEl = useStickyOffset(containerRef);
  return (
    <div ref={containerRef} data-testid="container">
      <header ref={setHeaderEl} data-testid="header" />
    </div>
  );
}

describe('useStickyOffset', () => {
  let originalRO;

  beforeEach(() => {
    originalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class MockRO {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.tagName === 'HEADER') {
        return {
          height: 156, width: 100,
          top: 0, left: 0, right: 100, bottom: 156,
          x: 0, y: 0,
          toJSON: () => ({}),
        };
      }
      return {
        height: 0, width: 0,
        top: 0, left: 0, right: 0, bottom: 0,
        x: 0, y: 0,
        toJSON: () => ({}),
      };
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalRO;
    vi.restoreAllMocks();
  });

  it('writes --sticky-offset on the container = header.getBoundingClientRect().height', () => {
    const { getByTestId } = render(<TestComp />);
    const container = getByTestId('container');
    expect(container.style.getPropertyValue('--sticky-offset')).toBe('156px');
  });
});
