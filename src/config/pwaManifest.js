// ============================================================
// src/config/pwaManifest.js — CP11 v3.0.0 Step 2 (§6.191, Q-UX.9).
//
// Builds the PWA manifest object passed to vite-plugin-pwa, with all
// path-bearing fields prefixed by the deploy base.
//
// Why a separate module (D2 ratified):
//   1. VitePWA receives `manifest` as a static config object — Vite
//      does NOT auto-rewrite root-relative paths inside it (unlike
//      paths in index.html, which Vite rewrites at build time using
//      the `base` config). The v2.8.1 deploy to GitHub Pages produced
//      `dist/manifest.webmanifest` with `start_url: "/"` and
//      `icons[].src: "/icons/..."`, both serving 404 on the
//      `/pharmatimer/` subpath.
//   2. Centralising the prefixing in a builder function lets a unit
//      test (pwaManifest.test.js) validate the contract without
//      booting Vite or reading `dist/manifest.webmanifest`.
//   3. The same module can be reused by future deploy scripts that
//      need the manifest values (e.g. a screenshot generator, a
//      sitemap builder).
//
// Location: src/config/ rather than project root. The file is
// build-time-only (imported by vite.config.js), but living under src/
// keeps it within the test glob of the project's vitest config and
// matches the convention "all source/test files under src/".
//
// Contract:
//   buildPwaManifest(base) where `base` ends with '/'
//   → manifest object with `scope`, `start_url`, and every
//     `icons[i].src` prefixed by `base`. All other fields are
//     deploy-agnostic.
// ============================================================

export function buildPwaManifest(base) {
  if (typeof base !== 'string' || !base.endsWith('/')) {
    throw new Error(
      `buildPwaManifest: base must be a string ending with '/', got ${JSON.stringify(base)}`
    );
  }
  return {
    name: 'PharmaTimer',
    short_name: 'PharmaTimer',
    description: 'Gestione terapia farmacologica quotidiana',
    lang: 'it',
    dir: 'ltr',
    categories: ['medical', 'health'],
    theme_color: '#15141A',
    background_color: '#FAFAF7',
    display: 'standalone',
    orientation: 'portrait',
    scope: base,
    start_url: base,
    icons: [
      { src: `${base}icons/icon-192.png`,           sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-512.png`,           sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-maskable-512.png`,  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
