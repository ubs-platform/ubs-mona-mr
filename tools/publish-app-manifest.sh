#!/usr/bin/env bash
set -euo pipefail

APP_NAME=${1:-}
PLATFORMS=${DOCKER_PLATFORMS:-linux/amd64,linux/arm64,linux/arm/v7}
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

normalize_platform() {
    printf '%s' "$1" | tr '/' '-'
}

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required."
    exit 1
fi

echo "$APP_NAME"
source "$SCRIPT_DIR/project-info.sh"
echo creating manifest for docker tag: $DOCKER_FULL_TAG

IFS=',' read -r -a PLATFORM_LIST <<< "$PLATFORMS"
IMAGE_TAGS=()
for PLATFORM in "${PLATFORM_LIST[@]}"; do
    PLATFORM_SLUG=$(normalize_platform "$PLATFORM")
    IMAGE_TAGS+=("${DOCKER_FULL_TAG}-${PLATFORM_SLUG}")
done

set -x
docker buildx imagetools create --tag "$DOCKER_FULL_TAG" "${IMAGE_TAGS[@]}"
set +x