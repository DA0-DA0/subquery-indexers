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
  const balance = (await Balance.get(balanceId)) || new Balance(balanceId);

  balance.addr = sender;
  balance.contract = contract;
  balance.amount =
    BigInt(message.msg.decodedMsg.msg.send.amount) +
    (balance.amount || BigInt("0"));

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
  const balance = (await Balance.get(balanceId)) || new Balance(balanceId);

  // I do what I must to appease the type checking queen.
  const max = (a: BigInt, b: BigInt) => BigInt((a > b ? a : b).toString());

  balance.addr = sender;
  balance.contract = contract;
  balance.amount = max(
    BigInt("0"),
    (balance.amount || BigInt("0")) -
      BigInt(message.msg.decodedMsg.msg.unstake.amount)
  );

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
