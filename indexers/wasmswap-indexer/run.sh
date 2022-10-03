#!/bin/bash

set -x

yarn codegen
yarn build
rm -rf .data/
yarn start:docker
