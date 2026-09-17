// Test harness — provides a `self` global so bg/utils.js attachments resolve.
// Each test file calls loadBgUtils() to populate it.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadScriptIntoContext(filename, contextExtras = {}) {
  const code = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  const sandboxSelf = {};
  const ctx = vm.createContext({
    self: sandboxSelf,
    console,
    URL,
    Number,
    String,
    Math,
    Object,
    Array,
    JSON,
    setTimeout,
    clearTimeout,
    ...contextExtras,
  });
  vm.runInContext(code, ctx, { filename });
  return sandboxSelf;
}

module.exports = {
  ROOT,
  loadScriptIntoContext,
  loadBgUtils() {
    return loadScriptIntoContext('bg/utils.js');
  },
};
