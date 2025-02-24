APPS=$(ls apps)
for APP in $APPS; do
    echo $(npm run start $APP) | sed 's/^/['"$APP"'] /' &
done
wait
