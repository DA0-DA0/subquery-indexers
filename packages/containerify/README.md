# containerify

Easily build yml files for deploying a [SubQuery](https://subquery.network/)
indexer via [https://docs.docker.com/compose/](Docker Compose). You will need to
set up a free [NFT.Storage](https://nft.storage/) account to store build zips on
IPFS (which will be downloaded by the container) as well as an s3-enabled
storage provider for DB backups. One option is
[Filebase](https://filebase.com/), which offers 5GB free and uses IPFS.

Create a `.env` file in `packages/containerify` by copying `.env.example` and
filling in the missing values. There are links in `.env.example` to the services
mentioned above.

Also create a `containerify.json` config file in the indexer folder that
describes the container versions to create. See the type defined in the
[containerify.ts](./containerify.ts) file for config options, and check out an
existing `containerify.json` file in the [daos
indexer](../../indexers/daos/containerify.json) for an example.

Once the environment is ready, run:

```sh
yarn containerify <indexer folder>
```

It will output one file in the specified indexer folder.

Run it with:

```sh
docker compose -f <docker compose yml> up
```
