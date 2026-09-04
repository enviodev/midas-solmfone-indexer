/*
 * solmFONE/USD data feed — automated (Pyth/Switchboard-fed) and manual updates.
 * Both instructions only carry the fields that actually changed; nullable args
 * pass straight through as nullable columns.
 */
import { indexer } from "envio";

const FIELDS = { instruction: ["args", "accounts"], transaction: ["signature"] } as const;

indexer.onInstruction(
  { program: "DataFeed", instruction: "update_feed", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const txSig = transaction.signature;
    context.FeedUpdate.set({
      id: txSig,
      feed: accounts.feed.address,
      kind: "auto",
      price: undefined,
      decimals: undefined,
      minPrice: args.min_price === null ? undefined : BigInt(args.min_price),
      maxPrice: args.max_price === null ? undefined : BigInt(args.max_price),
      maxStaleness: args.max_staleness === null ? undefined : args.max_staleness,
      slot: block.slot,
      txSig,
    });
  },
);

indexer.onInstruction(
  { program: "DataFeed", instruction: "update_manual_feed", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const txSig = transaction.signature;
    context.FeedUpdate.set({
      id: txSig,
      feed: accounts.manual_feed.address,
      kind: "manual",
      price: args.price === null ? undefined : BigInt(args.price),
      decimals: args.decimals === null ? undefined : args.decimals,
      minPrice: undefined,
      maxPrice: undefined,
      maxStaleness: undefined,
      slot: block.slot,
      txSig,
    });
  },
);
