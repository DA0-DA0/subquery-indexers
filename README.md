# subquery-indexers

Indexers built with [SubQuery](https://subquery.network/) to support [DAO
DAO](https://daodao.zone/) frontend and API needs.

## Setup

1. Install the latest stable yarn: https://yarnpkg.com/getting-started/install

2. Copy `.yarnrc.yml.example` into `.yarnrc.yml`. Do not change anything.

3. Add workspaces plugin:

```
yarn plugin import workspace-tools
```

4. Run yarn

```
yarn
```

## Containerify

See [the containerify README](./packages/containerify/README.md) file for
instructions on how to generate a Docker Compose container for an indexer.

## Relevant chain variables

### Second fork

RPC: `https://rpc-v3-archive.junonetwork.io/`

Start block height: `2578099`

End block height: `4136530`

### Current fork

RPC: `https://rpc-archive.junonetwork.io/`

Start block height: `4136532`

### First v1 cw-core on mainnet

Code ID: `428`

Block Height: `3642048`

Timestamp: `2022-06-22T19:51:16.12133876Z`
