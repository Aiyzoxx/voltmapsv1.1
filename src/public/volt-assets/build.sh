#!/bin/bash
# Volt Extension — esbuild bundler script
# Usage: ./build.sh [--watch] [--dev]
# Output: dist/popup.bundle.js + dist/background.bundle.js + dist/content.bundle.js
set -e
mkdir -p dist

WATCH_FLAG=""
MINIFY="--minify"
SOURCEMAP="--sourcemap"

for arg in "$@"; do
  case $arg in
    --watch) WATCH_FLAG="--watch" ;;
    --dev) MINIFY=""; SOURCEMAP="--sourcemap=inline" ;;
  esac
done

ESBUILD="npx --no-install esbuild"
COMMON_OPTS="--bundle --format=iife --target=chrome110 --legal-comments=none --charset=utf8 --tree-shaking=true $MINIFY $SOURCEMAP"

$ESBUILD popup.js      --outfile=dist/popup.bundle.js      $COMMON_OPTS $WATCH_FLAG &
PID1=$!
$ESBUILD background.js --outfile=dist/background.bundle.js $COMMON_OPTS $WATCH_FLAG &
PID2=$!
$ESBUILD content.js    --outfile=dist/content.bundle.js    $COMMON_OPTS $WATCH_FLAG &
PID3=$!

if [[ -z "$WATCH_FLAG" ]]; then
  wait $PID1 $PID2 $PID3
  echo ""
  echo "=== Bundle sizes ==="
  ls -lh dist/*.bundle.js | awk '{print $5"\t"$9}'
else
  echo "Watching... Ctrl+C to stop."
  wait
fi
