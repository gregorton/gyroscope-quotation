/* ============================================================
   build-portable.mjs
   Produces a SINGLE self-contained email-advertisement file that
   works on any PC (even offline): the engine JS is inlined and all
   referenced images are embedded as base64 data URIs.

   Run:  node build-portable.mjs
   Out:  email-advertisement.portable.html
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const R = (p) => resolve(here, p);

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

let js = readFileSync(R('email-studio.js'), 'utf8');
let html = readFileSync(R('email-advertisement.html'), 'utf8');

// Find every relative raster asset referenced in the engine and inline it for
// the portable editor preview. Public HTTPS export URLs remain unchanged.
const assetRe = /\.\.\/(?:email-campaigns\/assets|public)\/[A-Za-z0-9._-]+/g;
const paths = [...new Set(js.match(assetRe) || [])];

let embedded = 0, missing = [];
for (const rel of paths) {
  try {
    const buf = readFileSync(R(rel));
    const mime = MIME[extname(rel).toLowerCase()] || 'application/octet-stream';
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
    js = js.split(rel).join(dataUri);
    embedded++;
  } catch {
    missing.push(rel);
  }
}

// Use a distinct storage key so the portable copy never clashes with the dev version.
js = js.replace(/const LS_KEY = '[^']+';/, "const LS_KEY = 'emailStudio.portable.v1';");

// Inline the engine in place of the external <script src>.
const out = html.replace(
  /<script src="\.\/email-studio\.js"><\/script>/,
  () => `<script>\n${js}\n</script>`
);

const outPath = R('email-advertisement.portable.html');
writeFileSync(outPath, out, 'utf8');

const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0);
console.log(`OK  wrote email-advertisement.portable.html  (${kb} KB)`);
console.log(`    embedded ${embedded} image(s)`);
if (missing.length) console.log('    WARNING missing:', missing.join(', '));
