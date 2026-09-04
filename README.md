# Midas solmFONE indexer

HyperIndex demo for [midas.app](https://midas.app)'s solmFONE (Token-2022) on
Solana mainnet — the issuance/redemption lifecycle on the `MidasVaults`
program (`MidasZepq8k2oFNCCm1rm31rbbj68JSPJeXwqQu6NfZ`, IDL from
[midas-apps/contracts-solana](https://github.com/midas-apps/contracts-solana))
plus price updates on the solmFONE/USD `DataFeed` program
(`MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s`).

SVM has no event handlers, so every entity below is built from
`indexer.onInstruction` with the Anchor IDL supplying decoded `args`/named
`accounts` (`config.yaml`'s `programs[].idl`).

## Entities

- `MintRequest` / `RedeemRequest` — the queued request lifecycle
  (`mint_request`/`redeem_request` → `approve_*`/`reject_*`), keyed by the
  request PDA so all three instructions update one row.
- `InstantMint` / `InstantRedeem` — the atomic (`*_instant`) path.
- `FeedUpdate` — every `update_feed` (automated) / `update_manual_feed`
  (manual override) call on the price feed.
- `VaultStats` — single-row rollup for headline demo numbers.

## Quick start

```bash
pnpm install
pnpm envio codegen
pnpm envio dev     # local Postgres + Hasura, or:
pnpm envio start   # against a running local.envio stack
```

```graphql
{
  VaultStats(where: {id: {_eq: "global"}}) {
    mintRequestsCreated mintRequestsApproved instantMints
    redeemRequestsCreated redeemRequestsApproved instantRedeems
    totalMintVolume totalRedeemVolume
  }
  MintRequest(limit: 5, order_by: {requestSlot: desc}) {
    id status signer amountToken requestTxSig
  }
  FeedUpdate(limit: 5, order_by: {slot: desc}) {
    id kind price decimals slot
  }
}
```

## Given addresses → what they are

Looked up on-chain (`getAccountInfo`) before building this:

| Given as | Address | Owning program |
|---|---|---|
| solmFONE Token | `ESS9fuAbDiyDXy6y1ZAt9VSaiGPSqG8NwaWVX7dePdR7` | SPL Token-2022 (the mint itself) |
| solmFONE/USD Datafeed | `7UVwLrMTEDVvzQRaitJi7YLJcxFY8RTmXrHvSPMjTGDm` | `MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s` (DataFeed) |
| Issuance vault | `BzKC2gazYSmB9QE2yUKGZe8K2iedFREYpGZesCHEqRbg` | `MidasZepq8k2oFNCCm1rm31rbbj68JSPJeXwqQu6NfZ` (MidasVaults) |
| Issuance Account | `EaXc6FVh6m7R4cEZp1T4h6At95qguP8b8UNFe3pbYoH1` | MidasVaults |
| Redemption Vault | `Gzu6rgQ6ezGkNYExQ2WZJvV7Y9LidUKSUAjUZWb5v1c2` | MidasVaults |
| Redemption Account | `DNJMfdgrrVHKp1nFY5Qoqq14erqzdJoMve5THgKpCkrb` | MidasVaults |

This indexer covers the whole `MidasVaults`/`DataFeed` program pair rather
than filtering to these specific PDAs — on-chain history is small enough
(~400 total signatures on the mint at build time, this is a very fresh
deployment) that scoping wasn't necessary for a first pass. Add
`account_filters` per instruction if Midas runs a second token through the
same program later.
