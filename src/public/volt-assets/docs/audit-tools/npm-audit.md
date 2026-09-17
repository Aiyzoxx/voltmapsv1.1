# `npm audit --omit=dev` — 2026-05-12

## Result

**0 vulnerabilities** across the production dependency tree.

```text
$ npm audit --omit=dev
found 0 vulnerabilities
```

## Dep tree

```text
$ npm ls --omit=dev --depth=1
volt-extension@20.0.0
└── terser@5.47.x
```

That is the entire production tree — Volt ships no runtime npm deps. `terser` is build-time only (used by `obfuscate.js`).

## How to re-run

```bash
npm audit --omit=dev --json > docs/audit-tools/npm-audit.json
```

If anything ≥ HIGH ever appears, the CI workflow `.github/workflows/ci.yml#npm-audit` job fails (`--audit-level=high`).
