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

type Expiration =
  | {
      at_height: number;
    }
  | {
      // Nanoseconds
      at_time: number;
    }
  | {
      never: {};
    };

const ensureProposalModuleExists = async (address: string) => {
  let proposalModule = await ProposalModule.get(address);
  if (!proposalModule) {
    proposalModule = ProposalModule.create({
      id: address,
    });
    await proposalModule.save();
  }
};

const updateOrCreateAndGetProposal = async (
  proposalModuleAddress: string,
  proposalNumber: number,
  // Automatically update accordingly.
  shouldBeOpen: boolean,
  // Whether or not to create a new proposal if it does not already exist.
  createNew: boolean
): Promise<Proposal | undefined> => {
  const id = `${proposalModuleAddress}:${proposalNumber}`;
  let proposal = await Proposal.get(id);

  // Create proposal if does not exist.
  if (!proposal && createNew) {
    // Make proposal module if necessary.
    await ensureProposalModuleExists(proposalModuleAddress);

    // Get proposal expiration.
    let expiresAtDate: Date | undefined;
    let expiresAtHeight: number | undefined;
    try {
      const response = await api.queryContractSmart(proposalModuleAddress, {
        proposal: { proposal_id: proposalNumber },
      });
      // cw-proposal-single and cw-proposal-multiple supported
      if (
        !response ||
        !("proposal" in response) ||
        !response.proposal ||
        !("expiration" in response.proposal) ||
        !response.proposal.expiration
      ) {
        throw new Error(
          `Invalid proposal response: ${JSON.stringify(response)}`
        );
      }

      const expiration = response.proposal.expiration as Expiration;
      expiresAtDate =
        "at_time" in expiration
          ? // Timestamp is in nanoseconds, convert to microseconds.
            new Date(Number(expiration.at_time) / 1e6)
          : undefined;
      expiresAtHeight =
        "at_height" in expiration ? expiration.at_height : undefined;
    } catch (err) {
      logger.error(
        `Error retrieving expiration for ${id}: ${
          err instanceof Error ? err.message : `${err}`
        }`
      );
      return;
    }

    proposal = Proposal.create({
      id,
      moduleId: proposalModuleAddress,
      num: proposalNumber,
      open: shouldBeOpen,
      expiresAtDate,
      expiresAtHeight,
    });
    await proposal.save();
  }

  // Update proposal open status if necessary.
  if (proposal && proposal.open !== shouldBeOpen) {
    proposal.open = shouldBeOpen;
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
    logger.error(
      `Error retrieving proposalNumber for ${contract}: ${
        err instanceof Error ? err.message : `${err}`
      }`
    );
    return;
  }

  // Make proposal (creates module as well).
  await updateOrCreateAndGetProposal(contract, proposalNumber, true, true);

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

  const blockDate = new Date(cosmosMessage.block.block.header.time);
  const proposalNumber = Number(vote.proposal_id);

  let proposalOpen: boolean;
  try {
    proposalOpen =
      findAttribute(JSON.parse(cosmosMessage.tx.tx.log), "wasm", "status")
        .value === "open";
  } catch (err) {
    logger.error(
      `Error retrieving status for ${contract} > ${proposalNumber}: ${
        err instanceof Error ? err.message : `${err}`
      }`
    );
    return;
  }

  const wallet = await getWallet(sender);
  const proposal = await updateOrCreateAndGetProposal(
    contract,
    proposalNumber,
    proposalOpen,
    true
  );
  if (!proposal) {
    return;
  }

  // Create and save wallet voted proposal object with timestamp.
  await (
    await ProposalVote.create({
      id: `${contract}:${proposalNumber}:${sender}`,
      walletId: wallet.id,
      proposalId: proposal.id,
      votedAt: blockDate,
    })
  ).save();

  logger.info(`----- ${contract} > ${proposalNumber} > ${sender} ==> Voted (open: ${proposalOpen})`);
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

  // Update to not open.
  await updateOrCreateAndGetProposal(contract, proposalNumber, false, false);

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

  // Update to not open.
  await updateOrCreateAndGetProposal(contract, proposalNumber, false, false);

  logger.info(`----- ${contract} > ${proposalNumber} ==> Closed`);
}
