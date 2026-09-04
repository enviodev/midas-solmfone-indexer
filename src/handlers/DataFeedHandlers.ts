/*
 * solmFONE/USD data feed — automated (Pyth/Switchboard-fed) and manual updates.
 * Both instructions only carry the fields that actually changed; nullable args
 * pass straight through as nullable columns.
 */
import { indexer } from "envio";

indexer.onInstruction(
  { program: "DataFeed", instruction: "update_feed" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const txSig = transaction.signatures[0] ?? "";
    context.FeedUpdate.set({
      id: txSig,
      feed: accounts.feed,
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
  { program: "DataFeed", instruction: "update_manual_feed" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const txSig = transaction.signatures[0] ?? "";
    context.FeedUpdate.set({
      id: txSig,
      feed: accounts.manual_feed,
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
