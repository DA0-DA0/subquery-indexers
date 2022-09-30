#!/bin/sh

# wait for postgres to start
while ! pg_isready -q -d "$DB_DATABASE" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" ; do
  echo >&2 'Waiting for postgres, retrying in 5s...'
  sleep 5
done

echo "------- Downloading project zip url..."
cd /tmp
wget "$PROJECT_ZIP_URL" -O app.zip
unzip app.zip -d /app
rm app.zip
echo "------- Downloaded project zip url."

# run tini as subreaper since this init.sh is PID 1
export TINI_SUBREAPER=1

echo "------- Running node..."

/sbin/tini -- /usr/local/lib/node_modules/@subql/node-cosmos/bin/run -f=/app --db-schema=app --disable-historical=false
