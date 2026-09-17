// Volt Extension — esbuild config
// Usage: node build.config.js [--watch]
// Output: dist/popup.bundle.js (bundled + minified) + sourcemap
//
// Cible: Chrome MV3 (Chromium >= 110). Pas de polyfills.
// On bundle popup.js + ses modules pour code-splitting éventuel.

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const watch = process.argv.includes('--watch');
const dev = process.argv.includes('--dev') || watch;

const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const common = {
  bundle: true,
  format: 'iife',
  target: ['chrome110', 'firefox115'],
  platform: 'browser',
  legalComments: 'none',
  logLevel: 'info',
  sourcemap: dev ? 'inline' : false,
  minify: !dev,
  treeShaking: true,
  charset: 'utf8',
};

const entries = [
  { src: 'popup.js', out: 'dist/popup.bundle.js' },
  { src: 'background.js', out: 'dist/background.bundle.js' },
  { src: 'content.js', out: 'dist/content.bundle.js' },
];

async function build() {
  for (const { src, out } of entries) {
    if (!fs.existsSync(src)) continue;
    try {
      await esbuild.build({
        ...common,
        entryPoints: [src],
        outfile: out,
      });
      const size = fs.statSync(out).size;
      console.log(`✓ ${out} ${(size / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.error(`✗ ${src}:`, e.message);
      process.exitCode = 1;
    }
  }
}

if (watch) {
  (async () => {
    for (const { src, out } of entries) {
      const ctx = await esbuild.context({ ...common, entryPoints: [src], outfile: out });
      await ctx.watch();
      console.log(`watching ${src} → ${out}`);
    }
  })();
} else {
  build();
}
