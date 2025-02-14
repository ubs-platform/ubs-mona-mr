for var in "$@"; do
    export $(cat $var | xargs)
done
