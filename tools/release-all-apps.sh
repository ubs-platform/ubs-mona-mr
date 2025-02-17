# APP_NAME=$1

# if [ "$APP_NAME" = "" ]; then
#     echo "APP_NAME (first argument) is required"
# else
#     echo $APP_NAME
#     source $(dirname ${BASH_SOURCE[0]})/project-info.sh
#     echo determined docker tag: $DOCKER_FULL_TAG
#     echo "start to build $DOCKER_FULL_TAG"
#     set -x
#     docker build --build-arg APP_NAME="${APP_NAME}" --tag "$DOCKER_FULL_TAG" .
#     set +x
#     echo "start to push $DOCKER_FULL_TAG"
#     docker push "$DOCKER_FULL_TAG"
# fi
APPS=$(ls apps)
for APP in $APPS; do
    $(dirname ${BASH_SOURCE[0]})/release-app.sh $APP
done
