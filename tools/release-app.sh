APP_NAME=$1
VERSION=$(cat package.json | jq -r .version)
VERSION_TAG=$(cat package.json | jq -r .iksir | jq -r .childrenVersionTag)
if [ $VERSION_TAG = null ]; then
    VERSION_TAG=''
else
    VERSION_TAG="-${VERSION_TAG}"
fi

docker build
