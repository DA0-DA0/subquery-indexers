# CW20 Balance Indexer

Indexes CW20 balances for the targeted contract address

# Getting Started

### 1. Install dependencies

```shell
yarn
```

### 2. Generate types

```shell
yarn codegen
```

### 3. Build

```shell
yarn build
```

### 4. Run locally

```shell
yarn start:docker
```

# Quickstart 101

Please refer to [subquery university](https://university.subquery.network/quickstart/quickstart_chains/cosmos.html#goals) for getting started

tldr;

1. Update `schema.graphql` file.
   - Be sure to regenerate the types if any schema file changes were made.
   -
   ```shell
   yarn codegen
   ```
   - Files will dump in the `/src/types/models`
2. Update Project Manifest File `project.yaml`
   - This is the entry point to the project.
   - You will place the Cosmos Msgs here
3. Add Mapping Functions in `src/mappings`
   - These functions determine how chain data is transformed.
4. Build Project
   - execute:
   ```shell
   yarn build
   ```

### Misc info

1. `startBlock`s available with archive nodes
   - startBlock: 1055000 # juno-1 moneta # enabled SC's to be deployed to juno
   - startBlock: 2578099 # takumi ???
   - startBlock: 4136532 # phoenix
   - startBlock: 4415041 # phoenix v2
2. `increase_allowance` needs review
   - see this transaction: https://www.mintscan.io/juno/txs/777EA2C9C95BD2CFA610E02D665EA9AD1BE49323B36D2B5E6E934A61AC105DB6
   - The tx was allowance to allow the proposal module to grab the tokens for the proposal deposit. how to handle these?

### Notes

1. Error in latest subql-node-cosmos, so use v1.9.1
   - see docker-compose.yml line 21
2. This project was bound to port 3001 instead of 3000
   - see docker-compose.yml line 48
3. the default rpc has limited data and currently has issues. i recommend using pupmos' rpc as it goes back to the first phoenix block height (4136532)
   - see project.yaml line 25
4. if additional data is needed, there are certain methods that are whitelisted by subquery. see the list here
   - https://github.com/subquery/subql-cosmos/blob/main/packages/types/src/global.ts#L11
   - You may simply run `api` to execute `CosmWasmClient`
   - Calls must be deterministic
