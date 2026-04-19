// Minimal Vitest setup file.
// Registers @testing-library/jest-dom matchers (toBeInTheDocument, toHaveStyle, ...).
// AMB-7a.J: no globals beyond jest-dom matchers.
//
// We import from '@testing-library/jest-dom/vitest', which is the Vitest-aware
// entry point: it pulls `expect` from 'vitest' instead of assuming a global.
// This matches our `globals: false` config in vitest.config.js.
import '@testing-library/jest-dom/vitest';
