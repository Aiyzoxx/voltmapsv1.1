// Manifest + CSP tightness assertions.
// AUDIT R.1, Z.4.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

test('manifest_version is 3', () => {
  assert.equal(manifest.manifest_version, 3);
});

test('host_permissions contains only HTTPS — no http, no wildcards, no private IPs', () => {
  for (const host of manifest.host_permissions || []) {
    assert.match(host, /^https:\/\//, `host_permissions entry "${host}" must be https://`);
    assert.doesNotMatch(host, /\*:\/\//, `host_permissions "${host}" must not use wildcard scheme`);
    assert.doesNotMatch(host, /(?:127\.|192\.168\.|10\.|localhost)/, `host_permissions "${host}" must not target private IP / loopback`);
  }
});

test('content_scripts.matches and web_accessible_resources.matches are subsets of host_permissions', () => {
  const hosts = new Set(manifest.host_permissions || []);
  for (const cs of manifest.content_scripts || []) {
    for (const m of cs.matches || []) {
      assert.ok(hosts.has(m), `content_scripts match "${m}" not in host_permissions`);
    }
  }
  for (const war of manifest.web_accessible_resources || []) {
    for (const m of war.matches || []) {
      assert.ok(hosts.has(m), `WAR match "${m}" not in host_permissions`);
    }
  }
});

test('CSP forbids unsafe-inline / unsafe-eval in script-src', () => {
  const csp = manifest.content_security_policy?.extension_pages || '';
  // script-src directive
  const scriptSrc = (csp.match(/script-src[^;]*/) || [''])[0];
  assert.doesNotMatch(scriptSrc, /['"]unsafe-inline['"]/, `CSP script-src has 'unsafe-inline': "${scriptSrc}"`);
  // Allow 'wasm-unsafe-eval' (supabase-js WASM crypto) but reject bare 'unsafe-eval'.
  assert.doesNotMatch(scriptSrc, /['"]unsafe-eval['"]/, `CSP script-src has 'unsafe-eval' (only 'wasm-unsafe-eval' is allowed): "${scriptSrc}"`);
});

test('CSP connect-src restricted to api.webtvmedia.net + Google OAuth endpoints', () => {
  const csp = manifest.content_security_policy?.extension_pages || '';
  const connectSrc = (csp.match(/connect-src[^;]*/) || [''])[0];
  assert.match(connectSrc, /https:\/\/api\.webtvmedia\.net\b/);
  assert.match(connectSrc, /wss:\/\/api\.webtvmedia\.net\b/);
  // Google OAuth endpoints — both must be present
  assert.match(connectSrc, /accounts\.google\.com/);
  assert.match(connectSrc, /oauth2\.googleapis\.com/);
});

test('CSP frame-src whitelist is the SoundCloud only', () => {
  const csp = manifest.content_security_policy?.extension_pages || '';
  const frameSrc = (csp.match(/frame-src[^;]*/) || [''])[0];
  assert.match(frameSrc, /https:\/\/w\.soundcloud\.com\b/);
});

test('CSP base-uri is locked to self', () => {
  const csp = manifest.content_security_policy?.extension_pages || '';
  assert.match(csp, /base-uri\s+['"]?self['"]?/);
});

test('no inline event handlers in popup.html / admin.html / player.html', () => {
  for (const file of ['popup.html', 'admin.html', 'player.html', 'privacy.html']) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    // onclick=, onload=, onerror=, etc. attached inline.
    const re = /\son(?:click|load|error|input|change|submit|focus|blur|keydown|keyup|mousedown|mouseup|mouseover|mouseout)\s*=\s*["']/i;
    assert.doesNotMatch(html, re, `${file} contains an inline event handler attribute`);
  }
});

test('all <script src=…> in HTML files are extension-internal (no http/https)', () => {
  for (const file of ['popup.html', 'admin.html', 'player.html', 'privacy.html']) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const matches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
    for (const m of matches) {
      const src = m[1];
      assert.doesNotMatch(src, /^https?:\/\//, `${file} loads external script: ${src}`);
    }
  }
});

test('minimum_chrome_version is declared', () => {
  assert.ok(manifest.minimum_chrome_version, 'minimum_chrome_version missing');
  const v = Number(String(manifest.minimum_chrome_version).split('.')[0]);
  assert.ok(v >= 110, `minimum_chrome_version too low: ${manifest.minimum_chrome_version}`);
});
