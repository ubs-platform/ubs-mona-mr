APP_NAME=$1
REGEN_TEMP_IMGS=$2
REGEN_TEMP_IMGS_TRUE="true"

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required. And if second argument is passed as true, temp image will be created. After push the image, that will be removed"
else
    if [ "$REGEN_TEMP_IMGS" = "$REGEN_TEMP_IMGS_TRUE" ]; then
        $(dirname ${BASH_SOURCE[0]})/generate-temp-workspace.sh
    fi
    echo $APP_NAME
    source $(dirname ${BASH_SOURCE[0]})/project-info.sh
    echo determined docker tag: $DOCKER_FULL_TAG
    echo "start to build $DOCKER_FULL_TAG"
    set -x
    docker build --build-arg APP_NAME="${APP_NAME}" --tag "$DOCKER_FULL_TAG" .
    set +x
    echo "start to push $DOCKER_FULL_TAG"
    docker push "$DOCKER_FULL_TAG"
    if [ "$REGEN_TEMP_IMGS" = "$REGEN_TEMP_IMGS_TRUE" ]; then
        $(dirname ${BASH_SOURCE[0]})/destroy-temp-workspace.sh
    fi
fi
