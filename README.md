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

Easily build yml files for deploying a [SubQuery](https://subquery.network/)
indexer via [https://docs.docker.com/compose/](Docker Compose). You will need to
set up a free [NFT.Storage](https://nft.storage/) account to store build zips on
IPFS (which will be downloaded by the container) as well as an s3-enabled
storage provider for DB backups. One option is
[Filebase](https://filebase.com/), which offers 5GB free and uses IPFS.

Create a `.env` file in `packages/containerify` by copying `.env.example` and
filling in the missing values. There are links in `.env.example` to the services
mentioned above.

Once the environment is ready, run:

```sh
yarn containerify <indexer folder> <indexer port>
```

It will output one file in the specified indexer folder:

### docker-compose.deploy**\<indexer folder\>**\<timestamp\>.yml

Run it with:

```sh
docker compose -f <docker compose yml> up
```

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
