#!/usr/bin/env bash
set -euo pipefail

mode="${1:---auto}"
if (( $# > 1 )); then
  printf '%s\n' 'Usage: ./init.sh [--harness-only|--app|--help]' >&2
  exit 2
fi
case "$mode" in
  --auto|--harness-only|--app) ;;
  --help)
    printf '%s\n' 'Usage: ./init.sh [--harness-only|--app]' \
      'Default: validate harness; run application checks when package.json exists.' \
      '--app requires an application and all documented checks.' \
      'No dependency install, .env loading, service startup, migration, or Git writes.'
    exit 0
    ;;
  *) printf 'Unknown option: %s\n' "$mode" >&2; exit 2 ;;
esac

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$project_dir"
command -v node >/dev/null || { printf '%s\n' 'Node is required.' >&2; exit 1; }
command -v git >/dev/null || { printf '%s\n' 'Git is required.' >&2; exit 1; }

bash -n init.sh
node --check scripts/verify-harness.mjs
node --check scripts/verify-harness.test.mjs
node --test scripts/verify-harness.test.mjs
node scripts/verify-harness.mjs
git diff --check

if [[ "$mode" == --harness-only ]]; then
  printf '%s\n' 'PASS: harness checks only. Application checks were NOT run.'
  exit 0
fi
if [[ ! -f package.json ]]; then
  if [[ "$mode" == --app ]]; then
    printf '%s\n' 'FAIL: package.json is missing; application verification is unavailable.' >&2
    exit 1
  fi
  printf '%s\n' 'PASS: harness checks only; no application manifest exists.' \
    'Application tests, build, device checks, and live-provider checks were NOT run.'
  exit 0
fi

node scripts/verify-harness.mjs --app-contract
command -v pnpm >/dev/null || { printf '%s\n' 'pnpm is required; install the approved pinned tooling separately.' >&2; exit 1; }
declared_node="$(cat .node-version)"
if [[ "$(node --version)" != "v$declared_node" ]]; then
  printf 'FAIL: expected Node %s. No automatic install was attempted.\n' "$declared_node" >&2
  exit 1
fi
declared_pnpm="$(node --input-type=module -e "import fs from 'node:fs'; console.log(JSON.parse(fs.readFileSync('package.json', 'utf8')).packageManager.split('@')[1].split('+')[0]);")"
installed_pnpm="$(COREPACK_ENABLE_NETWORK=0 pnpm --version)"
if [[ "$installed_pnpm" != "$declared_pnpm" ]]; then
  printf 'FAIL: expected pnpm %s, found %s. No automatic install was attempted.\n' "$declared_pnpm" "$installed_pnpm" >&2
  exit 1
fi

for check in lint typecheck test:unit test:integration test:contracts test:architecture build test:e2e; do
  printf 'Running application check: pnpm run %s\n' "$check"
  COREPACK_ENABLE_NETWORK=0 APP_ENV=test AI_MODE=fake STORAGE_MODE=local EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 pnpm run "$check"
done
printf '%s\n' 'PASS: harness and documented application checks.' \
  'Device, live-provider, and real-haircut acceptance require separate evidence.'
