/*
 * Midas solmFONE — mint/redeem lifecycle on the MidasVaults program.
 * SVM has no event handlers, so every entity is built from onInstruction
 * with an Anchor IDL supplying decoded `args`/`accounts`. `fields` opts each
 * registration into the instruction args/accounts and the tx signature.
 */
import { indexer, type VaultStats } from "envio";

const STATS_ID = "global";
const FIELDS = { instruction: ["args", "accounts"], transaction: ["signature"] } as const;

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
  { program: "MidasVaults", instruction: "mint_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    context.MintRequest.set({
      id: accounts.mint_request.address,
      minterVault: accounts.minter_vault.address,
      signer: accounts.signer.address,
      paymentMint: accounts.payment_mint.address,
      amountToken: BigInt(args.amount_token),
      status: "Requested",
      requestTxSig: transaction.signature,
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
  { program: "MidasVaults", instruction: "approve_mint_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const existing = await context.MintRequest.get(accounts.mint_request.address);
    if (existing) {
      context.MintRequest.set({
        ...existing,
        status: "Approved",
        approveTxSig: transaction.signature,
        approveSlot: block.slot,
        newOutRate: BigInt(args.new_out_rate),
      });
    }
    await bumpStats(context, { mintRequestsApproved: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "reject_mint_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { accounts, transaction, block } = instruction;
    const existing = await context.MintRequest.get(accounts.mint_request.address);
    if (existing) {
      context.MintRequest.set({
        ...existing,
        status: "Rejected",
        rejectTxSig: transaction.signature,
        rejectSlot: block.slot,
      });
    }
    await bumpStats(context, { mintRequestsRejected: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "mint_instant", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const txSig = transaction.signature;
    const amountToken = BigInt(args.amount_token);
    context.InstantMint.set({
      id: txSig,
      signer: accounts.signer.address,
      minterVault: accounts.minter_vault.address,
      paymentMint: accounts.payment_mint.address,
      amountToken,
      minReceiveAmount: BigInt(args.min_receive_amount),
      slot: block.slot,
      txSig,
    });
    await bumpStats(context, { instantMints: 1, totalMintVolume: amountToken });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "redeem_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    context.RedeemRequest.set({
      id: accounts.redeem_request.address,
      redeemerVault: accounts.redeemer_vault.address,
      signer: accounts.signer.address,
      paymentMint: accounts.payment_mint.address,
      amountMToken: BigInt(args.amount_m_token),
      status: "Requested",
      requestTxSig: transaction.signature,
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
  { program: "MidasVaults", instruction: "approve_redeem_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const existing = await context.RedeemRequest.get(accounts.redeem_request.address);
    if (existing) {
      context.RedeemRequest.set({
        ...existing,
        status: "Approved",
        approveTxSig: transaction.signature,
        approveSlot: block.slot,
        newMTokenRate: BigInt(args.new_m_token_rate),
      });
    }
    await bumpStats(context, { redeemRequestsApproved: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "reject_redeem_request", fields: FIELDS },
  async ({ instruction, context }) => {
    const { accounts, transaction, block } = instruction;
    const existing = await context.RedeemRequest.get(accounts.redeem_request.address);
    if (existing) {
      context.RedeemRequest.set({
        ...existing,
        status: "Rejected",
        rejectTxSig: transaction.signature,
        rejectSlot: block.slot,
      });
    }
    await bumpStats(context, { redeemRequestsRejected: 1 });
  },
);

indexer.onInstruction(
  { program: "MidasVaults", instruction: "redeem_instant", fields: FIELDS },
  async ({ instruction, context }) => {
    const { args, accounts, transaction, block } = instruction;
    const txSig = transaction.signature;
    const amountMToken = BigInt(args.amount_m_token);
    context.InstantRedeem.set({
      id: txSig,
      signer: accounts.signer.address,
      redeemerVault: accounts.redeemer_vault.address,
      paymentMint: accounts.payment_mint.address,
      amountMToken,
      minReceiveAmount: BigInt(args.min_receive_amount),
      slot: block.slot,
      txSig,
    });
    await bumpStats(context, { instantRedeems: 1, totalRedeemVolume: amountMToken });
  },
);
