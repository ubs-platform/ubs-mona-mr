VERSION=$1
VERSION_TAG=$2
if [ "${VERSION}" != "" ]; then
    # echo "tamam"
    echo $(jq --arg VERSION "$VERSION" '.version=$VERSION' package.json) >package.json
    git add .
    git commit -m "Version upgrade to $VERSION"
    git push
    git switch -c "v$VERSION"
    git push --set-origin origin "v$VERSION"

else
    echo "Version is needed"
fi
# git switch master
