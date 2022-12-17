import { Snapshot, Balance, TotalBalance } from "../types";

export const AddSnapshotEntity = async (
    contractAddr: string,
    addr: string,
    blockHeight: bigint,
    txHash: string,
    amount: bigint,
    stakedAmount: bigint
) => {
    // grab all messages in this block for a contractAddr:addr:blockHeight
    const secondaryId = `${contractAddr}:${addr}:${blockHeight}`;
    const snapshotsBySecondaryId = await Snapshot.getBySecondaryId(secondaryId);

    const sequence = snapshotsBySecondaryId.length + 1;

    const snapshotId = `${secondaryId}:${sequence}`;
    const snapshot = new Snapshot(snapshotId);

    snapshot.secondaryId = secondaryId;
    snapshot.contractAddr = contractAddr;
    snapshot.blockHeight = BigInt(blockHeight);
    snapshot.txHash = txHash;
    snapshot.addr = addr;
    snapshot.sequence = sequence;
    snapshot.amount = amount;
    snapshot.stakedAmount = stakedAmount;

    await snapshot.save();
};

export const AddUpdateBalanceEntity = async (
    contractAddr: string,
    addr: string,
    amount: bigint,
    stakedAmount: bigint
) => {
    const balanceId = `${contractAddr}:${addr}`;
    const balanceEntity =
        (await Balance.get(balanceId)) ?? new Balance(balanceId);

    balanceEntity.contractAddr = contractAddr;
    balanceEntity.addr = balanceEntity.addr ?? addr;
    balanceEntity.amount = (balanceEntity.amount ?? BigInt(0)) + amount;
    balanceEntity.stakedAmount =
        (balanceEntity.stakedAmount ?? BigInt(0)) + stakedAmount;

    await balanceEntity.save();
};

export const AddUpdateTotalBalanceEntity = async (
    id: string,
    amount: bigint
) => {
    const totalBalanceEntity =
        (await TotalBalance.get(id)) ?? new TotalBalance(id);

    totalBalanceEntity.amount =
        (totalBalanceEntity.amount ?? BigInt(0)) + amount;

    await totalBalanceEntity.save();
};
