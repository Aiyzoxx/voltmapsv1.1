#!/usr/bin/env node
// Creates volt-extension-vX.Y.Z.zip from dist/
const { execSync } = require('child_process');
const { version } = require('../manifest.json');
const zipName = `volt-extension-v${version}.zip`;
execSync(`cd dist && zip -r ../${zipName} . -x '*.map'`, { stdio: 'inherit' });
console.log(`\nZip ready: ${zipName}`);
