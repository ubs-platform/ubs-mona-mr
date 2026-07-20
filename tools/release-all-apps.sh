#!/usr/bin/env bash
set -euo pipefail

for APP_DIR in apps/*/; do
    APP=$(basename "$APP_DIR")
    $(dirname ${BASH_SOURCE[0]})/release-app.sh "$APP"
done
