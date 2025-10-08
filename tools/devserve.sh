source tools/loadenv.sh dev.env apps/$1/dev.env
echo $NODE_OPTIONS
# NODE_OPTIONS="" nest start $1 --watch
nest start $1 --watch
# nest build $1
# echo "BUN-ASSED"
# bun dist/apps/$1/main.js