#!/bin/bash

# Wait for postgres to start.
while ! pg_isready -q -d "$POSTGRES_DATABASE" -U "$POSTGRES_USER" ; do
  echo >&2 '[password] Waiting for postgres, retrying in 10s...'
  sleep 10
done

# Update password.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<EOF
ALTER USER "$POSTGRES_USER" WITH PASSWORD '$POSTGRES_PASSWORD';
EOF

echo '[password] Password updated.'
