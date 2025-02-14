for var in "$@"; do 
    echo $var
    export $(cat $var | xargs)
done