// ============================================================
// src/config/pwaManifest.test.js — CP11 v3.0.0 Step 2 (§6.191).
//
// Single validation test: verifies that buildPwaManifest('/pharmatimer/')
// produces a manifest with every path-bearing field prefixed by
// '/pharmatimer/'. This is the unit-level guard that would have caught
// the v2.8.1 GitHub Pages deploy bug (manifest icons 404 on subpath)
// before ship.
//
// Pure import + property assertions — does NOT boot Vite or read
// dist/manifest.webmanifest. Runs in <50ms.
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildPwaManifest } from './pwaManifest.js';

describe('buildPwaManifest', () => {
  it('prefixes scope, start_url, and every icon src with the deploy base', () => {
    const m = buildPwaManifest('/pharmatimer/');
    expect(m.scope).toBe('/pharmatimer/');
    expect(m.start_url).toBe('/pharmatimer/');
    expect(m.icons).toHaveLength(3);
    for (const icon of m.icons) {
      expect(icon.src.startsWith('/pharmatimer/')).toBe(true);
    }
  });
});
