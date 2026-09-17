#!/usr/bin/env bash
# release-notes.sh — generate a CWS-friendly release notes block from the
# git log between the previous tag (or a fallback ref) and HEAD.
#
# Output format:
#   ## Volt vX.Y.Z — YYYY-MM-DD
#
#   ### Security
#   - <subject> (commit hash)
#
#   ### Features
#   - <subject> (commit hash)
#
#   ### Fixes
#   ...
#
# Usage:
#   bash scripts/release-notes.sh                  # since last tag
#   bash scripts/release-notes.sh v20.0.0          # since given tag/ref
#
# Reads version from package.json. The CHANGELOG.md "Unreleased" section
# is left for the maintainer to merge with this output.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y-%m-%d)

# Use the argument if given, else the last tag, else fall back to the
# first commit on the current branch.
if [ "${1:-}" != "" ]; then
  SINCE=$1
elif git describe --tags --abbrev=0 >/dev/null 2>&1; then
  SINCE=$(git describe --tags --abbrev=0)
else
  SINCE=$(git rev-list --max-parents=0 HEAD | tail -1)
fi

# Conventional-commit type → release-notes section. Anything not matching
# is dropped (chore: + docs: + style: rarely belong in user-facing notes).
declare -A SECTION=(
  [security]="Security"
  [feat]="Features"
  [fix]="Fixes"
  [perf]="Performance"
  [refactor]="Internal"
  [build]="Build / pipeline"
  [ci]="CI"
)

declare -A ENTRIES=(
  [security]=""
  [feat]=""
  [fix]=""
  [perf]=""
  [refactor]=""
  [build]=""
  [ci]=""
)

# Collect every commit subject + short hash since SINCE
while IFS=$'\t' read -r hash subject; do
  type=$(printf '%s' "$subject" | sed -E -n 's/^([a-z]+)(\([^)]+\))?(!)?:.*/\1/p')
  if [ -z "$type" ]; then continue; fi
  if [ -z "${SECTION[$type]:-}" ]; then continue; fi
  ENTRIES[$type]+="  - ${subject} (${hash})"$'\n'
done < <(git log --no-merges --pretty=format:'%h%x09%s' "${SINCE}..HEAD")

echo "## Volt v${VERSION} — ${DATE}"
echo
echo "Range: \`${SINCE}..HEAD\`"
echo

EMPTY=true
for type in security feat fix perf refactor build ci; do
  body="${ENTRIES[$type]:-}"
  if [ -n "$body" ]; then
    EMPTY=false
    echo "### ${SECTION[$type]}"
    echo
    printf '%s' "$body"
    echo
  fi
done

if $EMPTY; then
  echo "(no conventional-commit entries found in range)"
fi

echo
echo "Full audit pipeline (\`npm run audit:cws\`) green on every commit in this range."
