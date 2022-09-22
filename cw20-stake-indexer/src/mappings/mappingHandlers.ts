import { Balance } from "../types";
import {
  CosmosEvent,
  CosmosBlock,
  CosmosMessage,
  CosmosTransaction,
} from "@subql/types-cosmos";

// export async function handleBlock(block: CosmosBlock): Promise<void> {
//   const data = JSON.stringify(block, undefined, 2);
//   logger.info(data);
// }

/*

export async function handleTransaction(tx: CosmosTransaction): Promise<void> {
  const transactionRecord = Transaction.create({
    id: tx.hash,
    blockHeight: BigInt(tx.block.block.header.height),
    timestamp: tx.block.block.header.time,
  });
  await transactionRecord.save();
}
*/

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

  const id = `${sender}-${contract}`;
  const balance = (await Balance.get(id)) || new Balance(id);

  balance.id = id;
  balance.addr = sender;
  balance.contract = contract;
  // There is a one block delay before staked balances are considered.
  balance.blockHeight = BigInt(
    (message.block.block.header.height + 1).toString()
  );
  balance.amount =
    BigInt(message.msg.decodedMsg.msg.send.amount) +
    (balance.amount || BigInt("0"));

  await balance.save();
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

  const id = `${sender}-${contract}`;
  const balance = (await Balance.get(id)) || new Balance(id);

  balance.id = id;
  balance.addr = sender;
  balance.contract = contract;
  balance.blockHeight = BigInt(message.block.block.header.height.toString());
  balance.amount = balance.amount
    ? balance.amount - BigInt(message.msg.decodedMsg.msg.unstake.amount)
    : BigInt("0");

  await balance.save();
}
