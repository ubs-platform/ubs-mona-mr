APP_NAME=$1

if [ "$APP_NAME" = "" ]; then
    echo "APP_NAME (first argument) is required"
else
    echo $APP_NAME
    COMMON_LIBRARY_NAME="$1-common"
    npx nest generate app "$1"
    npx nest generate lib $COMMON_LIBRARY_NAME
    npm run xr extend-lib libs/$COMMON_LIBRARY_NAME
fi
