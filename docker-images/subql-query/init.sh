#!/bin/sh

# wait for subquery-node to start, who waits for postgres to start
while ! curl --silent --fail $SUBQUERY_NODE_URL_BASE/ready; do
  echo >&2 '------- Waiting for subquery-node, retrying in 10s...'
  sleep 10
done

# run tini as subreaper since this init.sh is PID 1
export TINI_SUBREAPER=1

echo "------- Running query..."

/sbin/tini -- /usr/local/lib/node_modules/@subql/query/bin/run --name=app --playground --indexer=http://subquery-node:3000
