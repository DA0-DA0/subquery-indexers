import { CosmosMessage } from "@subql/types-cosmos";
import { Event } from "@cosmjs/stargate/build/logs";
import { Wasmswap } from "../types/models/Wasmswap";
import { Snapshot } from "../types/models/Snapshot";

interface ExecuteMsg<T = any> {
  sender: string;
  contract: string;
  msg: T;
  funds: { amount: string; denom: string }[];
}

type TokenSelect = "Token1" | "Token2";

interface InputInfo {
  input_token: TokenSelect;
  input_amount: string;
}

interface SwapMsg {
  swap: InputInfo;
}

interface SwapToMsg {
  swap_and_send_to: InputInfo;
}

interface PassThroughMsg {
  pass_through_swap: { input_token: TokenSelect; input_token_amount: string };
}

async function handleSwapEvent(
  message: CosmosMessage<ExecuteMsg>,
  inputToken: TokenSelect,
  inputAmount: string,
  outputKey: string
) {
  const { idx: messageIndex, tx } = message;

  let log: {
    msg_index?: number;
    events: Event[];
  }[];
  try {
    log = JSON.parse(tx.tx.log);
  } catch (e) {
    logger.warn(`failed to parse log: (${e})`);
    return;
  }

  const target = messageIndex === 0 ? undefined : messageIndex;
  const events = log.find(({ msg_index }) => msg_index === target)?.events;
  const wasmResponse = events?.find(({ type }) => type === "wasm")?.attributes;
  const outputAmount = wasmResponse?.find(
    ({ key }) => key === outputKey
  )?.value;

  if (!outputAmount) {
    logger.warn(`undefined output amount ${JSON.stringify(log, undefined, 2)}`);
    return;
  }

  const contract = message.msg.decodedMsg.contract;

  let wasmswap = await Wasmswap.get(contract);
  if (!wasmswap) {
    // If we don't know anything yet, do a query against the contract.
    try {
      const { token1_reserve, token2_reserve } = (await api.queryContractSmart(
        contract,
        { info: {} }
      )) as {
        token1_reserve: string;
        token2_reserve: string;
      };
      wasmswap = Wasmswap.create({
        id: contract,
        contract: contract,
        token1Amount: BigInt(token1_reserve),
        token2Amount: BigInt(token2_reserve),
      });
    } catch (e) {
      logger.error(
        `failed to initialize state for contract (${contract}): (${e})`
      );
      return;
    }
  } else {
    // Just do a regular update.
    wasmswap.token1Amount +=
      inputToken === "Token1" ? BigInt(inputAmount) : -BigInt(outputAmount);
    wasmswap.token2Amount +=
      inputToken === "Token2" ? BigInt(inputAmount) : -BigInt(outputAmount);
  }
  await wasmswap.save();

  const blockHeight = message.block.block.header.height;
  const snapshotId = `${contract}:${blockHeight}`;
  await Snapshot.create({
    id: snapshotId,
    contract,
    blockHeight: BigInt(blockHeight.toString()),
    token1Amount: wasmswap.token1Amount,
    token2Amount: wasmswap.token2Amount,
  }).save();
}

export async function handleSwap(
  message: CosmosMessage<ExecuteMsg<SwapMsg>>
): Promise<void> {
  const swap = message.msg.decodedMsg.msg.swap;
  await handleSwapEvent(
    message,
    swap.input_token,
    swap.input_amount,
    "token_bought"
  );
}

export async function handleSwapTo(
  message: CosmosMessage<ExecuteMsg<SwapToMsg>>
): Promise<void> {
  const swap = message.msg.decodedMsg.msg.swap_and_send_to;
  await handleSwapEvent(
    message,
    swap.input_token,
    swap.input_amount,
    "native_transferred"
  );
}

export async function handlePassThroughSwap(
  message: CosmosMessage<ExecuteMsg<PassThroughMsg>>
): Promise<void> {
  const swap = message.msg.decodedMsg.msg.pass_through_swap;
  await handleSwapEvent(
    message,
    swap.input_token,
    swap.input_token_amount,
    "native_transferred"
  );
}
