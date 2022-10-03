#!/bin/sh

# Load image
docker load -i subql-indexers-nginx.tar

# Run
docker run --net host subql-indexers-nginx
