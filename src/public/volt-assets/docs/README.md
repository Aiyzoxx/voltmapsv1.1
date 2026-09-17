# Volt Extension — Documentation Index

Internal documentation for the Volt MV3 extension (Chrome Web Store + Edge Add-ons).
These files are excluded from `dist/` (see [obfuscate.js](../obfuscate.js) whitelist + [scripts/check-dist.sh](../scripts/check-dist.sh) `FORBIDDEN`).

## Quick start

| Audience | Read first |
|---|---|
| **CWS / Edge reviewer** | [REVIEWER_QUICKSTART.md](REVIEWER_QUICKSTART.md) — 5-minute tour |
| **Security auditor** | [SECURITY_AUDIT.md](SECURITY_AUDIT.md), [THREAT_MODEL.md](THREAT_MODEL.md), [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md) |
| **New contributor** | [ARCHITECTURE.md](ARCHITECTURE.md), [../CLAUDE.md](../CLAUDE.md), [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| **Operator / on-call** | [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md), [../RUNBOOK_DR.md](../RUNBOOK_DR.md) |

## Files

### Policy & store

- [REVIEWER_QUICKSTART.md](REVIEWER_QUICKSTART.md) — CWS reviewer landing doc.
- [COMPLIANCE_MATRIX.md](COMPLIANCE_MATRIX.md) — CWS policy ↔ enforcement test mapping.
- [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md) — every `permissions[]` entry justified by callsite.
- [SINGLE_PURPOSE.md](SINGLE_PURPOSE.md) — single-purpose statement.
- [STORE_LISTING.md](STORE_LISTING.md) — copy of the CWS / Edge listing.

### Security

- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) — historical audit findings + status.
- [THREAT_MODEL.md](THREAT_MODEL.md) — STRIDE walkthrough.
- [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) — first-60-minute playbook.

### Architecture & flows

- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime topology (extracted from CLAUDE.md §1).
- [PERF_NOTES.md](PERF_NOTES.md) — bundle sizes, polling cadence, boot profile.
- Sequence diagrams: [FLOW_AUTH.md](FLOW_AUTH.md), [FLOW_DUEL.md](FLOW_DUEL.md),
  [FLOW_CHAT.md](FLOW_CHAT.md), [FLOW_LEADERBOARD.md](FLOW_LEADERBOARD.md),
  [FLOW_PREMIUM.md](FLOW_PREMIUM.md), [FLOW_SOCIAL.md](FLOW_SOCIAL.md),
  [FLOW_TEAM.md](FLOW_TEAM.md), [FLOW_OAUTH_TAB_FALLBACK.md](FLOW_OAUTH_TAB_FALLBACK.md),
  [FLOW_MESSAGES.md](FLOW_MESSAGES.md), [FLOW_TOKEN.md](FLOW_TOKEN.md).

### Tool reports

- [audit-tools/](audit-tools/) — outputs from `npm audit`, Semgrep, SQLFluff.

## Maintenance

These docs ship alongside the source repo, not the extension package.
When changing extension behaviour:
1. Update the relevant doc here in the same PR.
2. If you add a permission, update both [PERMISSIONS_DEEP_DIVE.md](PERMISSIONS_DEEP_DIVE.md)
   *and* [STORE_LISTING.md](STORE_LISTING.md) before submitting to CWS.
3. If you touch SQL, update [ARCHITECTURE.md](ARCHITECTURE.md) §3.
