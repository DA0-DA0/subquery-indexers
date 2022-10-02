#!/bin/sh

echo "------- Downloading project zip url..."
cd /tmp
# timeout after 10 seconds, retrying 5 times
wget "$PROJECT_ZIP_URL" -O app.zip -t 5 -T 10
unzip -o -d /app app.zip

# wait for postgres to start
while ! pg_isready -q -d "$DB_DATABASE" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" ; do
  echo >&2 'Waiting for postgres, retrying in 10s...'
  sleep 10
done

# Run tini as subreaper since this init.sh is PID 1.
export TINI_SUBREAPER=1

echo "------- Running node..."

/sbin/tini -- /usr/local/lib/node_modules/@subql/node-cosmos/bin/run -f=/app --db-schema=app --disable-historical=false
