#!/usr/bin/env bash
# test-all.sh – Run tests across the ArcMeter monorepo
set -euo pipefail

echo "Testing packages/shared..."
(cd packages/shared && pnpm test)

echo "Testing services..."
for svc in services/*/; do
  if [ -d "$svc" ]; then
    echo "Testing $svc..."
    (cd "$svc" && pnpm test)
  fi
done

echo "Testing apps/web..."
(cd apps/web && pnpm test)

echo "Test complete."
