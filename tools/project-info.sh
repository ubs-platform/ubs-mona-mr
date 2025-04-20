export VERSION=$(cat package.json | jq -r .version)
export VERSION_TAG=$(cat package.json | jq -r .iksir | jq -r .childrenVersionTag)
export DOCKER_ORGNAME=$(cat package.json | jq -r .docker.organisation)
export IMG_PREFIX=$(cat package.json | jq -r .docker.imageNamePrefix)
if [ "$VERSION_TAG" = "null" ] || [ "$VERSION_TAG" = "" ] || [ "$VERSION_TAG" = "stable" ] || [ "$VERSION_TAG" = "latest" ]; then
    export VERSION_TAG=''
else
    export VERSION_TAG="-${VERSION_TAG}"
fi
export DOCKER_FULL_TAG=$DOCKER_ORGNAME/$IMG_PREFIX$APP_NAME:$VERSION$VERSION_TAG
