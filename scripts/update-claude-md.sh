#!/bin/bash
# Print the current project structure for reference when updating CLAUDE.md.
# Usage: bash scripts/update-claude-md.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Pages (app/(dashboard)/) ==="
find "$ROOT/app/(dashboard)" -name "page.tsx" | sort | while read -r f; do
  route=$(echo "$f" | sed "s|$ROOT/app/(dashboard)||" | sed 's|/page.tsx||')
  [ -z "$route" ] && route="/"
  echo "  $route  →  $f"
done

echo ""
echo "=== Custom Components (components/, excluding ui/) ==="
find "$ROOT/components" -maxdepth 1 -name "*.tsx" | sort | while read -r f; do
  echo "  $(basename "$f")"
done

echo ""
echo "=== Lib Modules (lib/) ==="
find "$ROOT/lib" -maxdepth 1 -type f | sort | while read -r f; do
  echo "  $(basename "$f")"
done

echo ""
echo "=== API Routes (app/api/) ==="
find "$ROOT/app/api" -name "route.ts" | sort | while read -r f; do
  route=$(echo "$f" | sed "s|$ROOT/app||" | sed 's|/route.ts||')
  echo "  $route"
done

echo ""
echo "=== localStorage Keys (grep for journalio_) ==="
grep -roh "journalio_[a-z_]*" "$ROOT/app" "$ROOT/components" "$ROOT/lib" 2>/dev/null | sort -u | while read -r key; do
  echo "  $key"
done
