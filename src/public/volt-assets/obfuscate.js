/*
 * Volt — Chrome Web Store / Edge Add-ons release builder.
 *
 * CWS code-readability policy (mandatory):
 *   https://developer.chrome.com/docs/webstore/program-policies/code-readability
 *
 * Allowed by CWS:
 *   - Minification (whitespace, dead code, var collapse)
 *   - Stripping debug logs
 * Forbidden by CWS:
 *   - Identifier mangling that defeats reading the code
 *   - String-array obfuscation / control-flow flattening
 *   - Self-decoding payloads / hex-encoded blobs
 *
 * This script therefore configures terser with `mangle: false` and no
 * property-name transforms. The post-build validator below rejects any
 * artefact that exhibits known obfuscation patterns.
 *
 * Usage:
 *   node obfuscate.js              # produce dist/ ready for store upload
 *   node obfuscate.js --check-only # validate sources without writing dist/
 */

// @ts-check
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SRC = __dirname;
const DIST = path.join(__dirname, 'dist');
const CHECK_ONLY = process.argv.includes('--check-only');
const _manifestJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const MANIFEST_VERSION = _manifestJson.version || '0.0.0';

const FIRST_PARTY_JS = [
  'background.js',
  'content.js',
  'popup.js',
  'player.js',
  'volumeInjected.js',
  'audioHook.js',
  'fpsInjected.js',
  'securityInjected.js',
  'supabaseConfig.js',
  'chatUIInjected.js',
  'popup_chat_handler.js',
  'volt_premium.js',
  'popup_premium_handler.js',
  'popup_team_handler.js',
  'volt-features.js',
  'volt-features-ui.js',
  'volt-presets.js',
  'volt-helpers.js',
  'admin.js',
  'admin_entry.js',
  'privacy.js',
  'welcome.js',
  ...listJsFiles('bg')
];

const THIRD_PARTY_JS = [
  'supabase-js.js',
  'chart.min.js'
];

const STATIC_FILES = [
  'manifest.json',
  'rules.json',
  'LICENSE',
  'PRIVACY.md',
  'popup.html',
  'player.html',
  'privacy.html',
  'welcome.html',
  'popup.css',
  'admin.html',
  'admin.css',
  'fontawesome-fallback.css'
];

const STATIC_DIRS = ['fonts', 'webfonts', 'i18n', 'icons'];

// Files where compression breaks runtime behaviour because they rely on
// string-based global names (e.g. self.handleSocial resolved by importScripts)
// or on minifier-hostile property accesses. Keep them whitespace-only.
const COMPRESS_SKIP = new Set([
  'background.js',
  'supabaseConfig.js'
]);

// Forbidden patterns CWS reviewers look for. The validator scans every
// produced .js file in dist/ and fails the build if any of them match.
const OBFUSCATION_SIGNATURES = [
  { name: 'string-array decoder', re: /var\s+_0x[a-f0-9]{2,}=\['/i },
  { name: 'hex-only identifiers',  re: /\b_0x[a-f0-9]{4,}\s*=\s*function/i },
  { name: 'massive hex string',    re: /(\\x[0-9a-f]{2}){200,}/i },
  { name: 'control-flow flatten',  re: /while\s*\(\s*!!\s*\[\s*\]\s*\)/ },
  // Common javascript-obfuscator output signatures:
  { name: 'string-array shuffler',  re: /\(function\s*\(\s*[_a-z],\s*[_a-z]\s*\)\s*\{\s*var\s+[_a-z]\s*=\s*function\s*\(\s*[_a-z]\s*\)\s*\{\s*while\s*\(/i },
  { name: 'self-decoding eval',     re: /eval\s*\(\s*function\s*\(/i },
  // Anti-debugger trick — calls `debugger;` in a tight loop:
  { name: 'debugger-trap',          re: /\bdebugger\s*;\s*\}\s*\)\s*\(\s*\)/ },
];

function listJsFiles(relativeDir) {
  const dir = path.join(SRC, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .sort()
    .map(file => path.join(relativeDir, file).replace(/\\/g, '/'));
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyFile(relativePath) {
  const src = path.join(SRC, relativePath);
  if (!fs.existsSync(src)) return;
  const dest = path.join(DIST, relativePath);
  ensureParent(dest);
  // Strip sourceMappingURL / sourceURL directives from JS so the dist bundle
  // doesn't reference any debug artefact (the .map is not shipped — leaving
  // the directive in is dead noise that flags as debug build to reviewers).
  if (relativePath.endsWith('.js')) {
    const code = fs.readFileSync(src, 'utf8')
      .replace(/\/\/[#@]\s*sourceMappingURL\s*=.*$/gm, '')
      .replace(/\/\/[#@]\s*sourceURL\s*=.*$/gm, '');
    fs.writeFileSync(dest, code);
  } else {
    fs.copyFileSync(src, dest);
  }
  console.log(`Copied ${relativePath}`);
}

function shouldCopyStaticDirectoryFile(relativePath) {
  const base = path.basename(relativePath).toLowerCase();
  if (base.startsWith('readme')) return false;
  if (base.endsWith('.map')) return false;
  return true;
}

function copyDirectory(relativePath) {
  const srcDir = path.join(SRC, relativePath);
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) copyDirectory(child);
    else if (entry.isFile() && shouldCopyStaticDirectoryFile(child)) copyFile(child);
  }
}

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .trim();
}

function compressEnabledFor(relativePath) {
  if (COMPRESS_SKIP.has(relativePath)) return false;
  if (relativePath.startsWith('bg/')) return false; // bg modules export via self.*
  return true;
}

async function buildJs(relativePath) {
  const src = path.join(SRC, relativePath);
  if (!fs.existsSync(src)) return;

  const code = fs.readFileSync(src, 'utf8');
  const originalSize = Buffer.byteLength(code, 'utf8');
  const compress = compressEnabledFor(relativePath);

  const minified = await minify(code, {
    ecma: 2020,
    // CWS readability: never mangle identifiers, never rename properties.
    mangle: false,
    keep_classnames: true,
    keep_fnames: true,
    compress: compress
      ? {
          drop_console: ['log', 'info', 'debug'], // keep warn/error for prod diag
          passes: 2,
          dead_code: true,
          conditionals: true,
          collapse_vars: true,
          reduce_vars: true,
          // Explicitly disable transforms that change semantics or hide intent.
          unsafe: false,
          hoist_funs: false,
          inline: 1
        }
      : false,
    format: {
      comments: false,
      ascii_only: false,           // do not hex-encode strings
      beautify: false,
      semicolons: true
    },
    sourceMap: false               // never ship sourcemaps to the store
  });

  const outputCode = minified.code || code;
  const outSize = Buffer.byteLength(outputCode, 'utf8');

  validateProducedCode(relativePath, outputCode);

  if (compress && outSize > originalSize * 0.95) {
    console.warn(`  ! ${relativePath}: minified output is ${(outSize / originalSize * 100).toFixed(1)}% of original — terser may have no-op'd`);
  }

  if (CHECK_ONLY) {
    console.log(`Checked ${relativePath} (${compress ? 'compressed' : 'whitespace-only'})`);
    return;
  }

  const dest = path.join(DIST, relativePath);
  ensureParent(dest);
  fs.writeFileSync(dest, `/*! Volt v${MANIFEST_VERSION} — CWS store build */\n${outputCode}`);
  console.log(`Built ${relativePath}${compress ? ' (compressed)' : ''} ${formatKB(outSize)}`);
}

function validateProducedCode(relativePath, code) {
  for (const sig of OBFUSCATION_SIGNATURES) {
    if (sig.re.test(code)) {
      throw new Error(
        `CWS policy violation in ${relativePath}: matches obfuscation pattern "${sig.name}". ` +
        `Chrome Web Store forbids obfuscated code (https://developer.chrome.com/docs/webstore/program-policies/code-readability).`
      );
    }
  }
}

function formatKB(bytes) {
  return `(${(bytes / 1024).toFixed(1)} KB)`;
}

function writeStaticFile(relativePath) {
  if (CHECK_ONLY) return;
  const src = path.join(SRC, relativePath);
  if (!fs.existsSync(src)) return;

  const dest = path.join(DIST, relativePath);
  ensureParent(dest);
  const ext = path.extname(relativePath);
  if (ext === '.html') fs.writeFileSync(dest, minifyHtml(fs.readFileSync(src, 'utf8')));
  else if (ext === '.css') fs.writeFileSync(dest, minifyCss(fs.readFileSync(src, 'utf8')));
  else fs.copyFileSync(src, dest);
  console.log(`Prepared ${relativePath}`);
}

function validateDist() {
  const required = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'supabaseConfig.js',
    'supabase-js.js',
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];
  const missing = required.filter(file => !fs.existsSync(path.join(DIST, file)));
  if (missing.length) throw new Error(`Missing dist files: ${missing.join(', ')}`);

  const forbidden = [];
  walkDist(DIST, (abs) => {
    const base = path.basename(abs).toLowerCase();
    if (base.endsWith('.map')) forbidden.push(abs);
    if (base === '.env' || base === '.ds_store') forbidden.push(abs);
    if (base.endsWith('.bak') || base.endsWith('.old')) forbidden.push(abs);
  });
  if (forbidden.length) {
    throw new Error(`Forbidden files inside dist/: ${forbidden.join(', ')}`);
  }
}

function walkDist(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDist(abs, cb);
    else cb(abs);
  }
}

async function build() {
  console.log(`Volt CWS build starting (${CHECK_ONLY ? 'check-only' : 'release'})...`);

  if (!CHECK_ONLY) {
    if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });
  }

  for (const file of FIRST_PARTY_JS) await buildJs(file);
  if (!CHECK_ONLY) {
    for (const file of THIRD_PARTY_JS) copyFile(file);
    for (const file of STATIC_FILES) writeStaticFile(file);
    for (const dir of STATIC_DIRS) copyDirectory(dir);
    validateDist();
  }

  console.log(CHECK_ONLY ? '\nCheck-only run complete (no dist/ written).' : '\nVolt dist build complete.');
}

build()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Build failed:', error.message || error);
    process.exit(1);
  });
