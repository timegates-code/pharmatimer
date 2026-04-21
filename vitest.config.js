import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest config for PharmaTimer.
// - jsdom is the default environment because most tests now touch React.
// - Domain/utils tests that are DOM-free keep the directive
//     // @vitest-environment node
//   on the first line (pattern already adopted from Step 4a).
// - setupFiles registers @testing-library/jest-dom matchers (see src/test/setup.js).
// Changelog Fase 2 AMB-7a.J (Sessione 7a).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: false,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
