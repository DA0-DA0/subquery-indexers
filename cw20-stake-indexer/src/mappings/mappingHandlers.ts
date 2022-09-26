import { Balance, Snapshot } from "../types";
import { CosmosMessage } from "@subql/types-cosmos";

interface ExecuteMsg<T> {
  sender: string;
  contract: string;
  msg: T;
  funds: { amount: string; denom: string }[];
}

interface SendMsg {
  send: { contract: string; amount: string; msg: string };
}

interface UnstakeMsg {
  unstake: { amount: string };
}

export async function handleSend(
  message: CosmosMessage<ExecuteMsg<SendMsg>>
): Promise<void> {
  const sender = message.msg.decodedMsg.sender;

  // Parse and then stringify to normalize.
  const base64 = message.msg.decodedMsg.msg.send.msg;
  const buf = Buffer.from(base64, "base64");
  let msg = {};
  try {
    msg = JSON.parse(buf.toString());
  } catch (e) {
    logger.error(`parse error: ${e}`);
    msg = {};
  }
  if (JSON.stringify(msg) !== '{"stake":{}}') {
    return;
  }

  const contract = message.msg.decodedMsg.msg.send.contract;

  const balanceId = `${sender}:${contract}`;
  let balance = await Balance.get(balanceId);
  if (!balance) {
    try {
      const { balance: staked_balance }: { balance: string } =
        await api.queryContractSmart(contract, {
          staked_balance_at_height: { address: sender },
        });
      balance = Balance.create({
        id: balanceId,
        addr: sender,
        contract,
        amount: BigInt(staked_balance),
      });
    } catch (e) {
      logger.error(
        `failed to initialize state for contract (${contract}): (${e})`
      );
      return;
    }
  } else {
    balance.amount += BigInt(message.msg.decodedMsg.msg.send.amount);
  }

  await balance.save();

  // We want to make sure we have a single entry per address, per block height,
  // per staking contract. If there are more than one stake messages in a single
  // block, we should load and update the previous value.
  //
  // Note: there is a one block delay before staked balances are reflected.
  const snapshotId = `${sender}:${contract}:${
    message.block.block.header.height + 1
  }`;

  const snapshot = (await Snapshot.get(snapshotId)) || new Snapshot(snapshotId);
  snapshot.addr = sender;
  snapshot.contract = contract;
  snapshot.amount = balance.amount;
  snapshot.blockHeight = BigInt(
    (message.block.block.header.height + 1).toString()
  );
  await snapshot.save();
}

export async function handleUnstake(
  message: CosmosMessage<ExecuteMsg<UnstakeMsg>>
): Promise<void> {
  if (
    !message.msg.decodedMsg.msg.unstake ||
    !message.msg.decodedMsg.msg.unstake.amount
  ) {
    return;
  }

  const sender = message.msg.decodedMsg.sender;
  const contract = message.msg.decodedMsg.contract;

  const balanceId = `${sender}:${contract}`;
  let balance = await Balance.get(balanceId);
  if (!balance) {
    try {
      const { balance: staked_balance }: { balance: string } =
        await api.queryContractSmart(contract, {
          staked_balance_at_height: { address: sender },
        });
      balance = Balance.create({
        id: balanceId,
        addr: sender,
        contract,
        amount: BigInt(staked_balance),
      });
    } catch (e) {
      logger.error(
        `failed to initialize state for contract (${contract}): (${e})`
      );
      return;
    }
  } else {
    balance.amount += BigInt(message.msg.decodedMsg.msg.unstake.amount);
  }

  await balance.save();

  // We want to make sure we have a single entry per address, per block height,
  // per staking contract. If there are more than one stake messages in a single
  // block, we should load and update the previous value.
  //
  // Note: there is a one block delay before staked balances are reflected.
  const snapshotId = `${sender}:${contract}:${
    message.block.block.header.height + 1
  }`;

  await Snapshot.create({
    id: snapshotId,
    addr: sender,
    contract,
    amount: balance.amount,
    blockHeight: BigInt((message.block.block.header.height + 1).toString()),
  }).save();
}
