APP_NAME=$1
MODE=$2

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required"
else
    VERSION=$(cat package.json | jq -r .version)
    VERSION_TAG=$(cat package.json | jq -r .iksir | jq -r .childrenVersionTag)
    DOCKER_ORGNAME=$(cat package.json | jq -r .docker.organisation)
    IMG_PREFIX=$(cat package.json | jq -r .docker.imageNamePrefix)
    if [ "$VERSION_TAG" = "null" ] || [ "$VERSION_TAG" = "stable" ] || [ "$VERSION_TAG" = "latest" ]; then
        VERSION_TAG=''
    else
        VERSION_TAG="-${VERSION_TAG}"
    fi
    DOCKER_FULL_TAG=$DOCKER_ORGNAME/$IMG_PREFIX$APP_NAME:$VERSION$VERSION_TAG
    echo determined docker tag: $DOCKER_FULL_TAG
    echo "start to build $DOCKER_FULL_TAG"
    docker build . --build-arg APP_NAME="$APP_NAME" --tag "$DOCKER_FULL_TAG"
    echo "start to push $DOCKER_FULL_TAG"
    docker build . --build-arg APP_NAME="$APP_NAME" --tag "$DOCKER_FULL_TAG"
fi
