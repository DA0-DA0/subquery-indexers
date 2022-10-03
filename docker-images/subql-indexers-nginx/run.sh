#!/bin/sh

# Load image
docker load -i subql-indexers-nginx.tar

# Run
docker run -d --net host --restart unless-stopped subql-indexers-nginx
