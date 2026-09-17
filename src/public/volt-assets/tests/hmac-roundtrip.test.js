// HMAC encoding round-trip — AUDIT W1.4 / Z.4.
//
// Verifies that the `b64:` / `hex:` prefix handling in
// background.js:_voltHmacSecretToBytes round-trips correctly for both
// encodings, and that a 64-char [0-9a-f] secret (ambiguous between
// hex and base64 in the legacy regex-only decoder) is now decoded
// deterministically as base64 when prefixed `b64:`.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

// We extract the helper from background.js as a string and eval it inside
// a minimal sandbox. The function only references `Uint8Array`, `atob`,
// `parseInt`, and `TextEncoder` (all standard).
function loadHmacHelper() {
  const src = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
  const match = src.match(/(const HMAC_KEY_RE_HEX[\s\S]*?function _voltHmacSecretToBytes[\s\S]*?^\})/m);
  assert.ok(match, '_voltHmacSecretToBytes not found in background.js');
  const ctx = vm.createContext({
    Uint8Array, atob, TextEncoder, parseInt,
  });
  vm.runInContext(match[1] + '\n;this._voltHmacSecretToBytes = _voltHmacSecretToBytes;', ctx);
  return ctx._voltHmacSecretToBytes;
}

const _voltHmacSecretToBytes = loadHmacHelper();

function bytesToHex(u8) {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

test('b64-prefixed secret decodes to the original 32 bytes', () => {
  const original = new Uint8Array(32);
  for (let i = 0; i < 32; i++) original[i] = (i * 7) & 0xff;
  const b64 = Buffer.from(original).toString('base64');
  const decoded = _voltHmacSecretToBytes('b64:' + b64);
  assert.equal(bytesToHex(decoded), bytesToHex(original));
});

test('hex-prefixed secret decodes correctly', () => {
  const original = new Uint8Array(32);
  for (let i = 0; i < 32; i++) original[i] = (i * 13) & 0xff;
  const hex = bytesToHex(original);
  const decoded = _voltHmacSecretToBytes('hex:' + hex);
  assert.equal(bytesToHex(decoded), hex);
});

test('legacy bare-base64 (no prefix) still decodes as base64', () => {
  const original = new Uint8Array(32);
  for (let i = 0; i < 32; i++) original[i] = 0x80 | (i & 0x7f);  // ensures non-hex chars
  const b64 = Buffer.from(original).toString('base64');
  const decoded = _voltHmacSecretToBytes(b64);
  assert.equal(bytesToHex(decoded), bytesToHex(original));
});

test('legacy 64-char hex (no prefix) still decodes as hex', () => {
  const hex = 'deadbeef'.repeat(8);
  const decoded = _voltHmacSecretToBytes(hex);
  assert.equal(decoded.length, 32);
  assert.equal(decoded[0], 0xde);
  assert.equal(decoded[1], 0xad);
});

test('ambiguous 64-char hex-also-valid-as-base64 — prefix disambiguates', () => {
  // Construct a 64-byte hex string that is ALSO a valid 32-byte base64 string.
  // Example: '6162636465666768' repeated — composed only of base64 chars too.
  const ambiguous = 'aabbccddeeff0011223344556677889900112233445566778899aabbccddeeff'.slice(0, 64);
  // With 'b64:' prefix, decoded length should match base64 decode (48 bytes from 64 base64 chars).
  const asB64 = _voltHmacSecretToBytes('b64:' + ambiguous);
  // With 'hex:' prefix, decoded length should be 32 (64 hex chars / 2).
  const asHex = _voltHmacSecretToBytes('hex:' + ambiguous);
  assert.equal(asHex.length, 32);
  assert.equal(asB64.length, 48); // base64 of 64 chars yields 48 bytes
  assert.notEqual(bytesToHex(asB64), bytesToHex(asHex));
});

test('empty input returns empty Uint8Array', () => {
  assert.equal(_voltHmacSecretToBytes('').length, 0);
  assert.equal(_voltHmacSecretToBytes(null).length, 0);
  assert.equal(_voltHmacSecretToBytes(undefined).length, 0);
});
