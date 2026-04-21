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
