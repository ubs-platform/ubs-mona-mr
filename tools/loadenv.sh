for var in "$@"; do
    if [ -f $var ]; then
        echo $var
        export $(cat $var | xargs)
    else
        echo "File $var does not exist. Skipping"
    fi
done
