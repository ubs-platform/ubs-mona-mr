VERSION=$1
VERSION_TAG=$2

if [ "${VERSION}" != "" ]; then
    # echo "tamam"
    VERSION_BRANCH="v$VERSION"
    echo $(jq --arg VERSION "$VERSION" '.version=$VERSION' package.json) >package.json
    if [ "${VERSION_TAG}" != "" ]; then
        echo $(jq --arg VERSION_TAG "$VERSION_TAG" '.childrenVersionTag=$VERSION_TAG' package.json) >package.json
    fi
    git add .
    git commit -m "Version upgrade to $VERSION"
    git push
    git switch -c $VERSION_BRANCH
    git push --set-upstream origin $VERSION_BRANCH
    npm run xr publish-libs
    # $(dirname ${BASH_SOURCE[0]})/release-all-apps.sh

else
    echo "Version is needed"
fi
# git switch master
