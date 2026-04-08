#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run() {
  printf '\n==> %s\n' "$*"
  "$@"
}

run pnpm exec tsc --noEmit
run pnpm test
run pnpm exec vitest run \
  --config vitest.browser.config.ts \
  --maxWorkers=1 \
  tests/browser/progression-meta-loop.test.tsx \
  tests/browser/interactions.test.ts \
  tests/browser/ui-and-controls.test.tsx \
  tests/browser/buildings.test.tsx
run pnpm build
run pnpm build:android
run bash -lc 'cd android && ./gradlew :app:testDebugUnitTest :app:compileDebugAndroidTestSources --no-daemon'
run pnpm audit --json

printf '\nRelease verification completed successfully.\n'
