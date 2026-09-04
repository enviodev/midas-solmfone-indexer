/*
 * Midas solmFONE — mint/redeem lifecycle on the MidasVaults program.
 * SVM has no event handlers, so every entity is built from onInstruction
 * with an Anchor IDL supplying decoded `args`/`accounts`.
 */
import { indexer, type VaultStats } from "envio";

const STATS_ID = "global";

async function bumpStats(
  context: { VaultStats: { get: (id: string) => Promise<VaultStats | undefined>; set: (e: VaultStats) => void } },
  patch: Partial<Omit<VaultStats, "id">>,
) {
  const prev = await context.VaultStats.get(STATS_ID);
  const base: VaultStats = prev ?? {
    id: STATS_ID,
    mintRequestsCreated: 0,
    mintRequestsApproved: 0,
    mintRequestsRejected: 0,
    instantMints: 0,
    redeemRequestsCreated: 0,
    redeemRequestsApproved: 0,
    redeemRequestsRejected: 0,
    instantRedeems: 0,
    totalMintVolume: 0n,
    totalRedeemVolume: 0n,
  };
  context.VaultStats.set({
    ...base,
    mintRequestsCreated: base.mintRequestsCreated + (patch.mintRequestsCreated ?? 0),
    mintRequestsApproved: base.mintRequestsApproved + (patch.mintRequestsApproved ?? 0),
    mintRequestsRejected: base.mintRequestsRejected + (patch.mintRequestsRejected ?? 0),
    instantMints: base.instantMints + (patch.instantMints ?? 0),
    redeemRequestsCreated: base.redeemRequestsCreated + (patch.redeemRequestsCreated ?? 0),
    redeemRequestsApproved: base.redeemRequestsApproved + (patch.redeemRequestsApproved ?? 0),
    redeemRequestsRejected: base.redeemRequestsRejected + (patch.redeemRequestsRejected ?? 0),
    instantRedeems: base.instantRedeems + (patch.instantRedeems ?? 0),
    totalMintVolume: base.totalMintVolume + (patch.totalMintVolume ?? 0n),
    totalRedeemVolume: base.totalRedeemVolume + (patch.totalRedeemVolume ?? 0n),
  });
}

indexer.onInstruction(
  { program: "MidasVaults", instruction: "mint_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    context.MintRequest.set({
      id: accounts.mint_request,
      minterVault: accounts.minter_vault,
      signer: accounts.signer,
      paymentMint: accounts.payment_mint,
      amountToken: BigInt(args.amount_token),
      status: "Requested",
      requestTxSig: transaction.signatures[0] ?? "",
      requestSlot: block.slot,
      approveTxSig: undefined,
      approveSlot: undefined,
      newOutRate: undefined,
      rejectTxSig: undefined,
      rejectSlot: undefined,
    });
    await bumpStats(context, { mintRequestsCreated: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "approve_mint_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const existing = await context.MintRequest.get(accounts.mint_request);
    if (existing) {
      context.MintRequest.set({
        ...existing,
        status: "Approved",
        approveTxSig: transaction.signatures[0] ?? "",
        approveSlot: block.slot,
        newOutRate: BigInt(args.new_out_rate),
      });
    }
    await bumpStats(context, { mintRequestsApproved: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "reject_mint_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { accounts } = instruction.params!;
    const existing = await context.MintRequest.get(accounts.mint_request);
    if (existing) {
      context.MintRequest.set({
        ...existing,
        status: "Rejected",
        rejectTxSig: transaction.signatures[0] ?? "",
        rejectSlot: block.slot,
      });
    }
    await bumpStats(context, { mintRequestsRejected: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "mint_instant" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const txSig = transaction.signatures[0] ?? "";
    const amountToken = BigInt(args.amount_token);
    context.InstantMint.set({
      id: txSig,
      signer: accounts.signer,
      minterVault: accounts.minter_vault,
      paymentMint: accounts.payment_mint,
      amountToken,
      minReceiveAmount: BigInt(args.min_receive_amount),
      slot: block.slot,
      txSig,
    });
    await bumpStats(context, { instantMints: 1, totalMintVolume: amountToken });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "redeem_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    context.RedeemRequest.set({
      id: accounts.redeem_request,
      redeemerVault: accounts.redeemer_vault,
      signer: accounts.signer,
      paymentMint: accounts.payment_mint,
      amountMToken: BigInt(args.amount_m_token),
      status: "Requested",
      requestTxSig: transaction.signatures[0] ?? "",
      requestSlot: block.slot,
      approveTxSig: undefined,
      approveSlot: undefined,
      newMTokenRate: undefined,
      rejectTxSig: undefined,
      rejectSlot: undefined,
    });
    await bumpStats(context, { redeemRequestsCreated: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "approve_redeem_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const existing = await context.RedeemRequest.get(accounts.redeem_request);
    if (existing) {
      context.RedeemRequest.set({
        ...existing,
        status: "Approved",
        approveTxSig: transaction.signatures[0] ?? "",
        approveSlot: block.slot,
        newMTokenRate: BigInt(args.new_m_token_rate),
      });
    }
    await bumpStats(context, { redeemRequestsApproved: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "reject_redeem_request" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { accounts } = instruction.params!;
    const existing = await context.RedeemRequest.get(accounts.redeem_request);
    if (existing) {
      context.RedeemRequest.set({
        ...existing,
        status: "Rejected",
        rejectTxSig: transaction.signatures[0] ?? "",
        rejectSlot: block.slot,
      });
    }
    await bumpStats(context, { redeemRequestsRejected: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "redeem_instant" },
  async ({ instruction, context }) => {
    const { transaction, block } = instruction;
    const { args, accounts } = instruction.params!;
    const txSig = transaction.signatures[0] ?? "";
    const amountMToken = BigInt(args.amount_m_token);
    context.InstantRedeem.set({
      id: txSig,
      signer: accounts.signer,
      redeemerVault: accounts.redeemer_vault,
      paymentMint: accounts.payment_mint,
      amountMToken,
      minReceiveAmount: BigInt(args.min_receive_amount),
      slot: block.slot,
      txSig,
    });
    await bumpStats(context, { instantRedeems: 1, totalRedeemVolume: amountMToken });
  },
);
