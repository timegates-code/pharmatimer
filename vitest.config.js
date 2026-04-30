import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Vitest config for PharmaTimer.
// - jsdom is the default environment because most tests now touch React.
// - Domain/utils tests that are DOM-free keep the directive
//     // @vitest-environment node
//   on the first line (pattern already adopted from Step 4a).
// - setupFiles registers @testing-library/jest-dom matchers (see src/test/setup.js).
// Changelog Fase 2 AMB-7a.J (Sessione 7a).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^virtual:pwa-register$/,
        replacement: fileURLToPath(
          new URL('./src/test/__mocks__/virtualPwaRegister.js', import.meta.url)
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: false,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // 8d-C (§6.114, chiude §6.84): sopprime i 2 warning React Router
    // future flag emessi dal MemoryRouter test (renderHelpers.jsx).
    // L'estensione delle future flag al test router in 8d-A (sed su
    // renderHelpers.jsx:153) causava hang deterministico >26min full
    // suite (§6.100). Filter onConsoleLog e' workaround non-invasivo:
    // i warning erano puro rumore stderr, nessuna info diagnostica
    // utile. No-op naturale al futuro upgrade react-router-dom 7.x.
    onConsoleLog(log, type) {
      if (
        type === 'stderr' &&
        log.includes('React Router Future Flag Warning')
      ) {
        return false;
      }
      // undefined = default emit (no override)
    },
  },
});
