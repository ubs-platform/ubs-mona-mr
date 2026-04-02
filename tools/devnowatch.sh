#!/bin/bash
source tools/loadenv.sh dev.env apps/$1/dev.env
echo E5 TLS DURUMU: $E5_TLS_ENABLED
echo JWT GİZLİSİ: $NX_SECRET_JWT
echo $NODE_OPTIONS
nest start $1
