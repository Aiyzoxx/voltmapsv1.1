# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 20.x    | ✅ active development, security fixes |
| < 20    | ❌ unsupported, please upgrade |

## Reporting a vulnerability

We take the security of Volt Extension seriously. If you believe you have
found a security vulnerability — in the browser extension, the Supabase
backend, or anywhere in the surrounding infrastructure — please report it
to **y.benyedder06@gmail.com** with the subject line:

```
[volt-security] short description
```

Please include, where applicable:

- The version of the extension (visible in `chrome://extensions` → details)
- A minimal proof-of-concept (PoC)
- The expected vs. actual impact
- Your assessment of severity (CVSS / qualitative is fine)
- Whether the issue is publicly known or has been disclosed elsewhere
- A way for us to credit you in any fix (or your preferred handle)

### What to expect

- **Initial acknowledgement** within 72 hours
- **Triage & severity classification** within 1 week
- **Status update or fix** within 30 days for high/critical issues; 90 days
  for low-impact issues
- **Public disclosure** coordinated with you after a fix has shipped

### Safe-harbour

Good-faith research consistent with this policy will not be pursued under:

- Computer Fraud and Abuse Act (CFAA, USA)
- Section 323-1 to 323-7 of the French Penal Code (Loi Godfrain)
- Equivalent computer-crime statutes in other jurisdictions

You may NOT, in the course of your research:

- Access, modify, or delete data that does not belong to you
- Run automated scans / DoS / brute-force against `api.webtvmedia.net`
- Phish or social-engineer users or staff
- Publicly disclose the vulnerability before a fix has shipped (without
  prior coordination)
- Profit from the vulnerability before disclosure

## Out-of-scope

The following are explicitly out of scope for our bounty / disclosure
program:

- Self-XSS only achievable by the user pasting hostile content into their
  own popup (we sanitise but do not defend the device owner against
  themselves)
- Compromised user devices (we cannot defend against an attacker with
  local browser access)
- Vulnerabilities in 3rd-party libraries that have already been disclosed
  upstream (please report to the upstream maintainer)
- Vulnerabilities in browser engines (please report to Chrome / Edge)
- Findings from automated tools without a working PoC

## How we handle security audit data

This repository is itself the result of a deep security audit. The
following artefacts may be useful when investigating:

- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — what was checked,
  what was found, what was fixed
- [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) — STRIDE walkthrough
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime topology
- [`docs/FLOW_AUTH.md`](docs/FLOW_AUTH.md) / [`FLOW_DUEL.md`](docs/FLOW_DUEL.md) /
  [`FLOW_CHAT.md`](docs/FLOW_CHAT.md) — sequence diagrams for the
  user-facing flows
- 24 automated tests under `tests/` enforce many invariants
  (`npm run audit:cws` to run them locally)

## Tested-clean invariants (snapshot)

The following are continuously enforced by `npm run audit:cws`:

- No `eval` / `new Function(` / `setTimeout(string)` in shipped JS
- No `//# sourceMappingURL=` directive in shipped JS
- Every SECURITY DEFINER Postgres function pins `search_path`
- Every `admin_*` Postgres function calls an authorization gate
- Every JS-touched Postgres table has RLS enabled
- Every FK to `users(id)` declares `ON DELETE` (GDPR delete chain)
- Every `chrome.runtime.sendMessage` action passes the five-step
  sender gate
- Every `window.postMessage` receiver verifies origin AND source
- HMAC signing key never persists to disk
- Build is byte-deterministic
- No TODO / FIXME / XXX / HACK comments in shipped code

Pull requests that break any of these tests are not mergeable without
sign-off.
