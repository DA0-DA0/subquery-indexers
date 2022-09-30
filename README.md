# subquery-indexers

Indexers built with [SubQuery](https://subquery.network/) to support [DAO
DAO](https://daodao.zone/) frontend and API needs.

## Akashify

Easily build a deploy yml file for deploying a
[SubQuery](https://subquery.network/) indexer on
[Akash](https://akash.network/). You will need to set up a free
[NFT.Storage](https://nft.storage/) account to store build zips on IPFS (which
will be downloaded by the Akash node) as well as an s3-enabled storage provider
for DB backups. One option is [Filebase](https://filebase.com/), which offers
5GB free and uses IPFS.

Create a `.env` file in `packages/akashify` by copying `.env.example` and
filling in the missing values. There are links in `.env.example` to the services
mentioned above.

Once the environment is ready, run:

```sh
yarn akashify <indexer folder>
```

It will output two files in the specified indexer folder:

### deploy_\<indexer folder\>_\<timestamp\>.yml

A ready-to-go Akash SDL deployment file.

### docker-compose.akash-local.yml

An almost identical setup to the Akash deployment that can run locally via
docker compose, in case the setup needs any debugging. It does NOT persist any
data. Run it with:

```sh
docker compose -f docker-compose.akash-local.yml up
```
