#!/bin/sh

# Build
docker build --platform linux/amd64 -t subql-indexers-nginx .

# Export
docker save -o subql-indexers-nginx.tar subql-indexers-nginx
