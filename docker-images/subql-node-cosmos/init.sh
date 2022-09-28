#!/bin/sh

cd /tmp
wget "$PROJECT_ZIP_URL" -O app.zip
unzip app.zip -d /app
rm app.zip

/sbin/tini -- /usr/local/lib/node_modules/@subql/node-cosmos/bin/run -f=/app --db-schema=app --disable-historical=false
