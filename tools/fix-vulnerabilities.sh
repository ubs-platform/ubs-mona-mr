#!/bin/bash
# fix-vulnerabilities.sh
# Runs npm audit and attempts to fix vulnerabilities automatically.
# Usage:
#   tools/fix-vulnerabilities.sh          → safe fixes only (no breaking changes)
#   tools/fix-vulnerabilities.sh --force  → includes breaking-change fixes (use with care)

set -euo pipefail

FORCE=""
if [[ "${1:-}" == "--force" ]]; then
  FORCE="--force"
  echo "⚠️  --force mode: breaking-change upgrades included. Test thoroughly afterwards."
fi

echo "=== Current audit report ==="
npm audit || true   # don't exit on audit findings

echo ""
echo "=== Applying fixes (npm audit fix ${FORCE}) ==="
npm audit fix ${FORCE}

echo ""
echo "=== Audit report after fix ==="
npm audit || true

echo ""
echo "Done. If vulnerabilities remain, they may require manual intervention"
echo "(e.g. a transitive dependency with no upstream fix yet)."
echo "Run 'npm audit' for the full advisory list."
