APPS=$(ls apps)
for APP in $APPS; do
    $(dirname ${BASH_SOURCE[0]})/release-app.sh $APP
done
