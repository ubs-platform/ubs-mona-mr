for var in "$@"; do
    if [ -f "$var" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            case "$line" in
                ''|'#'*)
                    continue
                    ;;
            esac

            case "$line" in
                *=*)
                    key=${line%%=*}
                    value=${line#*=}
                    export "$key=$value"
                    ;;
            esac
        done < "$var"
    else
        echo "File $var does not exist. Skipping"
    fi
done