source tools/loadenv.sh dev.env apps/$1/dev.env
nest start -w $1 --fascist-master
# nest build $1
# echo "BUN-ASSED"
# bun dist/apps/$1/main.js