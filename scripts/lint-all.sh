#!/usr/bin/env bash
# lint-all.sh – Run lint across the ArcMeter monorepo
set -euo pipefail

echo "Linting packages/shared..."
(cd packages/shared && pnpm lint)

echo "Linting services..."
for svc in services/*/; do
  if [ -d "$svc" ]; then
    echo "Linting $svc..."
    (cd "$svc" && pnpm lint)
  fi
done

echo "Linting apps/web..."
(cd apps/web && pnpm lint)

echo "Lint complete."
