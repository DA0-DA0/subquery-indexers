#!/bin/sh

# Setup cron.

# Make env accessible to cron.
env | grep -Ev 'BASHOPTS|BASH_VERSINFO|EUID|PPID|SHELLOPTS|UID' >> /etc/environment

# Install crontab.
sed -e "s#\${BACKUP_SCHEDULE}#$BACKUP_SCHEDULE#" /crontab > /etc/cron.d/scheduler
chmod +x /etc/cron.d/scheduler
crontab /etc/cron.d/scheduler

# Start cron daemon.
cron
echo "[init] Cron started"

# Background script to ensure password set correctly (waits for DB to start).
/scripts/password.sh &

# Start postgres.
docker-entrypoint.sh postgres
