APP_NAME=$1
# Platforms to build/push. Covers amd64 servers, 64-bit ARM (Apple Silicon, Raspberry Pi OS 64-bit)
# and 32-bit ARM (Raspberry Pi OS 32-bit / armhf).
PLATFORMS=${DOCKER_PLATFORMS:-linux/amd64,linux/arm64,linux/arm/v7}
BUILDX_BUILDER_NAME=ubs-mona-multiarch-builder

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required."
else
    echo $APP_NAME
    source $(dirname ${BASH_SOURCE[0]})/project-info.sh
    echo determined docker tag: $DOCKER_FULL_TAG

    # Ensure a buildx builder capable of multi-platform builds exists (docker-container driver).
    # docker/setup-buildx-action already provides one of these in CI; this is mainly for local use.
    docker buildx inspect "$BUILDX_BUILDER_NAME" >/dev/null 2>&1 || docker buildx create --name "$BUILDX_BUILDER_NAME" --driver docker-container
    docker buildx use "$BUILDX_BUILDER_NAME"

    CACHE_REF="$DOCKER_ORGNAME/$IMG_PREFIX${APP_NAME}:buildcache"

    echo "start to build & push $DOCKER_FULL_TAG for platforms: $PLATFORMS"
    set -x
    docker buildx build \
        --platform "$PLATFORMS" \
        --build-arg APP_NAME="${APP_NAME}" \
        --tag "$DOCKER_FULL_TAG" \
        --cache-from "type=registry,ref=${CACHE_REF}" \
        --cache-to "type=registry,ref=${CACHE_REF},mode=max" \
        --push \
        .
    set +x
fi
