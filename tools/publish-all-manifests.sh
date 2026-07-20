#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

for APP_DIR in apps/*/; do
    APP=$(basename "$APP_DIR")
    echo "Publishing manifest for $APP"
    "$SCRIPT_DIR/publish-app-manifest.sh" "$APP"
done