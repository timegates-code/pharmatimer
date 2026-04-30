// Idempotent icon generator for PharmaTimer PWA (AMB-10.D + AMB-10.E + AMB-10.F).
// Run: node scripts/genera-icone.mjs
// Outputs:
//   public/icons/icon-192.png             (PWA manifest, purpose: any)
//   public/icons/icon-512.png             (PWA manifest, purpose: any)
//   public/icons/icon-maskable-512.png    (PWA manifest, purpose: maskable, ~10% safe area)
//   public/icons/apple-touch-icon-180.png (iOS home screen)
//   public/favicon.svg                    (browser tab favicon)
//
// Design (AMB-10.D): "PT" bold sans-serif on solid #15141A background.
// On the build host the SVG <text> element resolves to whichever bold sans-serif
// is locally available (Helvetica on macOS, DejaVu Sans on most Linux, etc.).
// Output PNGs are committed artifacts: regenerate explicitly only on redesign.

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONS_DIR = resolve(ROOT, 'public/icons');
const PUBLIC_DIR = resolve(ROOT, 'public');

const BG = '#15141A';
const FG = '#FFFFFF';
const FONT_FAMILY = 'Helvetica, Inter, &quot;Helvetica Neue&quot;, Arial, sans-serif';

/**
 * Build the SVG source string for a square icon.
 * For maskable variants the glyph is shrunk so it sits inside the inner 80%
 * safe area (Android adaptive icon contract).
 */
function buildIconSvg({ size, maskable = false }) {
  const sizeRatio = maskable ? 0.52 : 0.62;
  const fontSize = Math.round(size * sizeRatio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <text x="50%" y="50%" dy=".34em" text-anchor="middle"
        font-family='${FONT_FAMILY}' font-size="${fontSize}" font-weight="700"
        fill="${FG}" letter-spacing="-0.04em">PT</text>
</svg>`;
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${BG}"/>
  <text x="50%" y="50%" dy=".34em" text-anchor="middle"
        font-family='Helvetica, Inter, &quot;Helvetica Neue&quot;, Arial, sans-serif'
        font-size="20" font-weight="700"
        fill="${FG}" letter-spacing="-0.04em">PT</text>
</svg>
`;

async function genPng(size, name, maskable = false) {
  const svg = buildIconSvg({ size, maskable });
  const out = resolve(ICONS_DIR, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ${name.padEnd(32)} ${size}x${size}${maskable ? '  (maskable, ~10% safe area)' : ''}`);
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  console.log('Generating PharmaTimer PWA icons...');
  await genPng(192, 'icon-192.png');
  await genPng(512, 'icon-512.png');
  await genPng(512, 'icon-maskable-512.png', true);
  await genPng(180, 'apple-touch-icon-180.png');
  const faviconPath = resolve(PUBLIC_DIR, 'favicon.svg');
  await writeFile(faviconPath, FAVICON_SVG, 'utf8');
  console.log(`  favicon.svg                      32x32  (browser tab)`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
