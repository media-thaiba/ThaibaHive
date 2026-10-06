#!/bin/bash
# Audit script to scan for non-canonical permission strings in the codebase
# Exits with code 1 if any violations found (excluding test files and known false positives)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXIT_CODE=0

echo "🔍 Auditing permission strings for canonical format compliance..."
echo "Root: $ROOT_DIR"
echo ""

# Pattern: requireAuth(handler, 'permission'), can('permission'), hasPermission(role, 'permission')
# Also catches: 'domain:resource:action', 'domain_resource_action' in permission-like contexts

check_file() {
  local file="$1"
  local rel_file="${file#$ROOT_DIR/}"

  # Skip test files, node_modules, .next, build outputs
  if [[ "$rel_file" =~ node_modules ]] || \
     [[ "$rel_file" =~ \.next ]] || \
     [[ "$rel_file" =~ \.d\.ts$ ]] || \
     [[ "$rel_file" =~ \.test\. ]] || \
     [[ "$rel_file" =~ \.spec\. ]] || \
     [[ "$rel_file" =~ coverage ]] || \
     [[ "$rel_file" =~ __tests__ ]]; then
    return 0
  fi

  local violations=0

  # Check TypeScript/TSX files
  if [[ "$file" =~ \.(ts|tsx)$ ]]; then
    # requireAuth calls
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        echo "  ❌ $rel_file: $line"
        violations=$((violations + 1))
      fi
    done < <(grep -nE "requireAuth\([^)]*['\"][^'\"]*[:_][^'\"]*['\"]" "$file" 2>/dev/null || true)

    # hasPermission calls
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        echo "  ❌ $rel_file: $line"
        violations=$((violations + 1))
      fi
    done < <(grep -nE "hasPermission\([^,]+,\s*['\"][^'\"]*[:_][^'\"]*['\"]" "$file" 2>/dev/null || true)

    # Standalone permission strings that look non-canonical (colon or underscore, not URL)
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        # Filter false positives: URLs, colors, CSS, error messages
        if [[ ! "$line" =~ (http:|https:|mailto:|tel:|postgres:|mongodb:|rgb\(|rgba\(|hsl\(|hsla\(|var\(|calc\(|url\(|localhost:|127\.0\.0\.1:|error:|warning:|info:|debug:) ]]; then
          echo "  ⚠️  $rel_file: $line"
          violations=$((violations + 1))
        fi
      fi
    done < <(grep -nE "['\"][a-z]+[_:][a-z]+[_:][a-z]+['\"]" "$file" 2>/dev/null || true)
  fi

  # Check Dart files
  if [[ "$file" =~ \.dart$ ]]; then
    # can('permission') calls
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        echo "  ❌ $rel_file: $line"
        violations=$((violations + 1))
      fi
    done < <(grep -nE "can\(['\"][^'\"]*[:_][^'\"]*['\"]" "$file" 2>/dev/null || true)

    # hasPermission calls
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        echo "  ❌ $rel_file: $line"
        violations=$((violations + 1))
      fi
    done < <(grep -nE "hasPermission\([^,]+,\s*['\"][^'\"]*[:_][^'\"]*['\"]" "$file" 2>/dev/null || true)
  fi

  return $violations
}

# Scan source files
echo "📦 Scanning TypeScript/TSX files..."
find "$ROOT_DIR/src" "$ROOT_DIR/packages" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  check_file "$file" || EXIT_CODE=1
done

echo "📱 Scanning Dart files..."
find "$ROOT_DIR/thaibahive_mobile_app/lib" -type f -name "*.dart" 2>/dev/null | while read -r file; do
  check_file "$file" || EXIT_CODE=1
done

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ All permission strings are in canonical domain.resource.action format"
else
  echo "❌ Non-canonical permission strings found (see above)"
fi

exit $EXIT_CODE