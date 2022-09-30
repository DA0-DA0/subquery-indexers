#!/bin/sh

# wait for subquery-node to start
while ! curl --silent --fail http://subquery-node:3000/ready; do
  echo >&2 'Waiting for subquery-node, retrying in 5s...'
  sleep 5
done

# wait for postgres to start
while ! pg_isready -q -d "$DB_DATABASE" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" ; do
  echo >&2 'Waiting for postgres, retrying in 5s...'
  sleep 5
done

# run tini as subreaper since this init.sh is PID 1
export TINI_SUBREAPER=1

echo "------- Running query..."

/sbin/tini -- /usr/local/lib/node_modules/@subql/query/bin/run --name=app --playground --indexer=http://subquery-node:3000
