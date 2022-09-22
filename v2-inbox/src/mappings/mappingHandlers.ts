import { CosmosMessage } from "@subql/types-cosmos";
import { findAttribute } from "@cosmjs/stargate/build/logs";
import { Proposal, ProposalModule, ProposalVote, Wallet } from "../types";

interface DecodedMsg<T extends any = any> {
  sender: string;
  contract: string;
  msg: T;
  funds: {
    denom: string;
    amount: string;
  }[];
}

const ensureProposalModuleExists = async (address: string) => {
  let proposalModule = await ProposalModule.get(address);
  if (!proposalModule) {
    proposalModule = ProposalModule.create({
      id: address,
    });
    await proposalModule.save();
  }
};

const getProposal = async (
  proposalModuleAddress: string,
  proposalId: number,
  open = false
): Promise<Proposal | undefined> => {
  const id = `${proposalModuleAddress}:${proposalId}`;
  let proposal = await Proposal.get(id);
  if (!proposal && open) {
    // Make proposal module if necessary.
    await ensureProposalModuleExists(proposalModuleAddress);

    proposal = Proposal.create({
      id,
      moduleId: proposalModuleAddress,
      num: proposalId,
      open: true,
    });
    await proposal.save();
  }
  return proposal;
};

const getWallet = async (address: string) => {
  let wallet = await Wallet.get(address);
  if (!wallet) {
    wallet = Wallet.create({
      id: address,
    });
    await wallet.save();
  }
  return wallet;
};

export async function handlePropose(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    contract,
    msg: { propose },
  } = cosmosMessage.msg.decodedMsg;

  // cw-proposal-single and cw-proposal-multiple supported
  if (!("title" in propose) && !("description" in propose)) {
    return;
  }

  let proposalNumber: number;
  try {
    proposalNumber = Number(
      findAttribute(JSON.parse(cosmosMessage.tx.tx.log), "wasm", "proposal_id")
        .value
    );
  } catch (err) {
    console.error(err);
    return;
  }

  // Make proposal (creates module as well).
  await getProposal(contract, proposalNumber);

  logger.info(`----- ${contract} > ${proposalNumber} ==> Proposed`);
}

export async function handleVote(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    contract,
    sender,
    msg: { vote },
  } = cosmosMessage.msg.decodedMsg;

  // cw-proposal-single and cw-proposal-multiple supported
  const voteKeys = Object.keys(vote).sort();
  if (voteKeys.join(".") !== "proposal_id.vote") {
    return;
  }

  const proposalNumber = Number(vote.proposal_id);

  const wallet = await getWallet(sender);
  const proposal = await getProposal(contract, proposalNumber, true);

  // Create and save wallet voted proposal object with timestamp.
  await (
    await ProposalVote.create({
      id: `${contract}:${proposalNumber}:${sender}`,
      walletId: wallet.id,
      proposalId: proposal.id,
      votedAt: cosmosMessage.block.block.header.time
    })
  ).save();

  logger.info(`----- ${contract} > ${proposalNumber} > ${sender} ==> Voted`);
}

export async function handleExecute(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    contract,
    msg: { execute },
  } = cosmosMessage.msg.decodedMsg;

  // cw-proposal-single and cw-proposal-multiple supported
  const executeKeys = Object.keys(execute).sort();
  if (executeKeys.join(".") !== "proposal_id") {
    return;
  }

  const proposalNumber = Number(execute.proposal_id);

  const proposal = await getProposal(contract, proposalNumber);
  if (!proposal) {
    return;
  }

  proposal.open = false;
  await proposal.save();

  logger.info(`----- ${contract} > ${proposalNumber} ==> Executed`);
}

export async function handleClose(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    contract,
    msg: { close },
  } = cosmosMessage.msg.decodedMsg;

  // cw-proposal-single and cw-proposal-multiple supported
  const closeKeys = Object.keys(close).sort();
  if (closeKeys.join(".") !== "proposal_id") {
    return;
  }

  const proposalNumber = Number(close.proposal_id);

  const proposal = await getProposal(contract, proposalNumber);
  if (!proposal) {
    return;
  }

  proposal.open = false;
  await proposal.save();

  logger.info(`----- ${contract} > ${proposalNumber} ==> Closed`);
}
