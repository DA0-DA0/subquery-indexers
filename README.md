# subquery-indexers

Indexers built with [SubQuery](https://subquery.network/) to support [DAO
DAO](https://daodao.zone/) frontend and API needs.

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

### docker-compose.deploy_*\<indexer folder\>*_\<timestamp\>.yml

Run it with:

```sh
docker compose -f <docker compose yml> up
```
