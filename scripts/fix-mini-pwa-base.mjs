// ============================================================
// scripts/fix-mini-pwa-base.mjs — Fase 3 (i), s.6.236.
//
// Post-build transform for the Mini distribution profile only.
//
// Why this exists:
//   build:mini uses `vite build --mode mini --base=/`. The `--base`
//   flag rewrites root-relative paths in index.html, but NOT inside
//   the PWA manifest object (vite-plugin-pwa receives `manifest` as a
//   static object; vite.config.js calls buildPwaManifest('/pharmatimer/')
//   with a hardcoded literal — the §6.191 asymmetry). Result: the
//   Mini-served manifest.webmanifest carries scope/start_url/icons
//   prefixed '/pharmatimer/', but the Mini serves the PWA at root '/'.
//   That breaks "Add to Home Screen" (out-of-scope nav + 404 icons).
//
// What it does:
//   Rewrites manifest.webmanifest ONLY, replacing the leading
//   '/pharmatimer/' prefix with '/' in scope, start_url and every
//   icons[].src. The service worker is already base-'/' clean
//   (verified empirically: 0 occurrences of '/pharmatimer/' in sw.js),
//   so it is left untouched.
//
// Constraints respected:
//   - Zero modification to vite.config.js (Q-W.1 LOCKED).
//   - Operates on the dist-mini ARTIFACT, not on source.
//   - Idempotent: re-running on an already-'/' manifest is a no-op.
//   - Self-asserting: exits non-zero if the result is not '/'-scoped.
//
// Usage: node scripts/fix-mini-pwa-base.mjs [dist-mini]
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FROM_PREFIX = '/pharmatimer/';
const TO_PREFIX = '/';

const distDir = process.argv[2] || 'dist-mini';
const manifestPath = join(distDir, 'manifest.webmanifest');

if (!existsSync(manifestPath)) {
  console.error(`[fix-mini-pwa-base] manifest not found: ${manifestPath}`);
  process.exit(1);
}

const raw = readFileSync(manifestPath, 'utf8');
let manifest;
try {
  manifest = JSON.parse(raw);
} catch (err) {
  console.error(`[fix-mini-pwa-base] invalid JSON in ${manifestPath}: ${err.message}`);
  process.exit(1);
}

function rebase(value) {
  if (typeof value === 'string' && value.startsWith(FROM_PREFIX)) {
    return TO_PREFIX + value.slice(FROM_PREFIX.length);
  }
  return value;
}

const before = { scope: manifest.scope, start_url: manifest.start_url };

if (manifest.scope === TO_PREFIX && manifest.start_url === TO_PREFIX) {
  console.log('[fix-mini-pwa-base] already base "/" — no-op (idempotent).');
  process.exit(0);
}

manifest.scope = rebase(manifest.scope);
manifest.start_url = rebase(manifest.start_url);
if (Array.isArray(manifest.icons)) {
  manifest.icons = manifest.icons.map((ic) => ({ ...ic, src: rebase(ic.src) }));
}

writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');

const check = JSON.parse(readFileSync(manifestPath, 'utf8'));
const iconsOk = Array.isArray(check.icons) && check.icons.every(
  (ic) => typeof ic.src === 'string' && ic.src.startsWith('/') && !ic.src.startsWith(FROM_PREFIX)
);
if (check.scope !== TO_PREFIX || check.start_url !== TO_PREFIX || !iconsOk) {
  console.error('[fix-mini-pwa-base] ASSERT FAILED: manifest not fully rebased to "/".');
  console.error(JSON.stringify({ scope: check.scope, start_url: check.start_url, icons: check.icons }, null, 2));
  process.exit(2);
}

console.log(`[fix-mini-pwa-base] rebased ${manifestPath}: scope ${before.scope} -> ${check.scope}, start_url ${before.start_url} -> ${check.start_url}, icons[${check.icons.length}] -> "/...".`);
process.exit(0);
