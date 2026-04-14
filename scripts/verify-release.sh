#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

timestamp() {
  date '+%H:%M:%S'
}

run() {
  local start=${SECONDS}
  printf '\n[%s] ==> %s\n' "$(timestamp)" "$*"
  "$@"
  local elapsed=$((SECONDS - start))
  printf '[%s] <== completed in %ss\n' "$(timestamp)" "$elapsed"
}

run pnpm exec tsc --noEmit
run pnpm test
run pnpm exec vitest run \
  --config vitest.browser.config.ts \
  tests/browser/progression-meta-loop.test.tsx
run pnpm exec vitest run \
  --config vitest.browser.config.ts \
  tests/browser/interactions.test.ts
run pnpm exec vitest run \
  --config vitest.browser.config.ts \
  tests/browser/ui-and-controls.test.tsx
run pnpm exec vitest run \
  --config vitest.browser.config.ts \
  tests/browser/buildings.test.tsx
run pnpm build
run pnpm build:android
run bash -lc 'cd android && ./gradlew :app:testDebugUnitTest :app:compileDebugAndroidTestSources --no-daemon'
run pnpm audit --json

printf '\n[%s] Release verification completed successfully.\n' "$(timestamp)"
