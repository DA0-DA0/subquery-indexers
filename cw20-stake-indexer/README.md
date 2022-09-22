# Staked Balances Indexer

This is a [SubQuery](https://subquery.network/) indexer of the staked
balances of a
[cw20-stake](https://github.com/DA0-DA0/dao-contracts/tree/v1.0.0/contracts/cw20-stake)
contract.

For example, to query the staked balance of an `ADDRESS` at `HEIGHT`:

```graphql
query {
  balances(
    first: 1
    filter: {
      blockHeight: { lessThan: "HEIGHT" }
      addr: { equalTo: "ADDRESS" }
    }
  ) {
    nodes {
      addr
      amount
    }
  }
}
```
