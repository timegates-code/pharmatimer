// Minimal Vitest setup file.
// Registers @testing-library/jest-dom matchers (toBeInTheDocument, toHaveStyle, ...).
// AMB-7a.J: no globals beyond jest-dom matchers.
//
// We import from '@testing-library/jest-dom/vitest', which is the Vitest-aware
// entry point: it pulls `expect` from 'vitest' instead of assuming a global.
// This matches our `globals: false` config in vitest.config.js.
import '@testing-library/jest-dom/vitest';

// AMB-7c-1.H — auto-cleanup for @testing-library/react.
// Background (§6.32): with `globals: false` in vitest.config.js, the implicit
// afterEach(cleanup) that testing-library registers via its globals-detecting
// entry point does NOT fire. Tests that mount the same component multiple
// times (or that use `screen` queries across cases) would then see leaked
// DOM nodes from previous tests. We register the cleanup explicitly here.
//
// This closes the tactical `within(container)` scoping used in 7b-2 tests:
// those tests keep working (container-scoped queries remain correct even
// with cleanup in place), and new tests from 7c-1 onward can rely on
// `screen` safely.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);

// CP2 Sessione 11-bis (par.6.206) -- jsdom platform polyfill.
//
// jsdom does not implement Element.prototype.scrollIntoView. The OggiView
// scroll-to-anchor useEffect calls `el.scrollIntoView(...)` on the ready
// transition. Without this polyfill, any test file that renders OggiView
// without its own scroll mock crashes via the rAF callback before cleanup.
//
// Tests that want to OBSERVE scrollIntoView calls (OggiView.scroll.test.jsx)
// override Element.prototype.scrollIntoView with vi.fn() in their own
// beforeEach -- this assignment is safe because vi.fn() is also a function
// and replaces the no-op cleanly.
//
// Distinct from AMB-7a.J ("no globals beyond jest-dom matchers"): this is
// a jsdom platform polyfill (env-fill bridging missing browser API), NOT a
// test-runner global utility. Same category as a polyfill for ResizeObserver
// or IntersectionObserver would be -- it makes jsdom behave like a browser
// for an API that any production browser implements natively.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
