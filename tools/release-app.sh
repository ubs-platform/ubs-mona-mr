#!/usr/bin/env bash
set -euo pipefail

APP_NAME=${1:-}
# Platforms to build/push. Covers amd64 servers, 64-bit ARM (Apple Silicon, Raspberry Pi OS 64-bit)
# and 32-bit ARM (Raspberry Pi OS 32-bit / armhf).
PLATFORMS=${DOCKER_PLATFORMS:-linux/amd64,linux/arm64,linux/arm/v7}
BUILDX_BUILDER_NAME=ubs-mona-multiarch-builder
DOCKER_PUSH_BY_PLATFORM=${DOCKER_PUSH_BY_PLATFORM:-0}
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PACKAGE_DOCKER_JSON=package.docker.json

normalize_platform() {
    printf '%s' "$1" | tr '/' '-'
}

create_stable_package_manifest() {
    jq 'del(.version) | .iksir.childrenVersionTag = null' package.json > "$PACKAGE_DOCKER_JSON"
}

cleanup_stable_package_manifest() {
    rm -f "$PACKAGE_DOCKER_JSON"
}

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required."
    exit 1
else
    echo "$APP_NAME"
    source "$SCRIPT_DIR/project-info.sh"
    echo determined docker tag: $DOCKER_FULL_TAG

    # Ensure a buildx builder capable of multi-platform builds exists (docker-container driver).
    # docker/setup-buildx-action already provides one of these in CI; this is mainly for local use.
    docker buildx inspect "$BUILDX_BUILDER_NAME" >/dev/null 2>&1 || docker buildx create --name "$BUILDX_BUILDER_NAME" --driver docker-container
    docker buildx use "$BUILDX_BUILDER_NAME"

    create_stable_package_manifest
    trap cleanup_stable_package_manifest EXIT INT TERM

    IMAGE_TAG="$DOCKER_FULL_TAG"
    CACHE_REF="$DOCKER_ORGNAME/$IMG_PREFIX${APP_NAME}:buildcache"

    if [ "$DOCKER_PUSH_BY_PLATFORM" = "1" ]; then
        if printf '%s' "$PLATFORMS" | grep -q ','; then
            echo "DOCKER_PUSH_BY_PLATFORM=1 requires a single platform in DOCKER_PLATFORMS."
            exit 1
        fi

        PLATFORM_SLUG=$(normalize_platform "$PLATFORMS")
        IMAGE_TAG="${DOCKER_FULL_TAG}-${PLATFORM_SLUG}"
        CACHE_REF="$DOCKER_ORGNAME/$IMG_PREFIX${APP_NAME}:buildcache-${PLATFORM_SLUG}"
    fi

    echo "start to build & push $IMAGE_TAG for platforms: $PLATFORMS"
    set -x
    docker buildx build \
        --platform "$PLATFORMS" \
        --build-arg APP_NAME="${APP_NAME}" \
        --tag "$IMAGE_TAG" \
        --cache-from "type=registry,ref=${CACHE_REF}" \
        --cache-to "type=registry,ref=${CACHE_REF},mode=max" \
        --push \
        .
    set +x
    cleanup_stable_package_manifest
    trap - EXIT INT TERM
fi
