#!/bin/sh

# wait for subquery-node to start, who waits for postgres to start
while ! curl --silent --fail http://subquery-node:3000/ready; do
  echo >&2 'Waiting for subquery-node, retrying in 5s...'
  sleep 5
done

echo "------- Sleeping for 10 more seconds to let server be fully started..."
sleep 10

# run tini as subreaper since this init.sh is PID 1
export TINI_SUBREAPER=1

echo "------- Running query..."

/sbin/tini -- /usr/local/lib/node_modules/@subql/query/bin/run --name=app --playground --indexer=http://subquery-node:3000
