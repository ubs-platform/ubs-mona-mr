VERSION=$1
VERSION_TAG=$2

if [ "${VERSION}" != "" ]; then
    # echo "tamam"
    VERSION_BRANCH="v$VERSION"
    echo $(jq --arg VERSION "$VERSION" '.version=$VERSION' package.json) >package.json
    git add .
    git commit -m "Version upgrade to $VERSION"
    git push
    git switch -c $VERSION_BRANCH
    git push --set-upstream origin $VERSION_BRANCH

else
    echo "Version is needed"
fi
# git switch master
