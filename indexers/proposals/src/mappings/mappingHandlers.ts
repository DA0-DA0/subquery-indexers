import { CosmosMessage } from "@subql/types-cosmos";
import { Event } from "@cosmjs/stargate/build/logs";
import { Proposal, ProposalModule, ProposalVote, Wallet } from "../types";
import { objectKeyLayoutMatchesSchema } from "./utils";

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

const getProposalId = (
  proposalModuleAddress: string,
  proposalNumber: number
): string => `${proposalModuleAddress}:${proposalNumber}`;

const updateOrCreateAndGetProposal = async (
  proposalModuleAddress: string,
  proposalNumber: number,
  shouldBeOpen: boolean,
  blockDate: Date
): Promise<Proposal | undefined> => {
  let proposal = await Proposal.get(
    getProposalId(proposalModuleAddress, proposalNumber)
  );

  // Create proposal if does not exist.
  if (!proposal) {
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
        !objectKeyLayoutMatchesSchema(response, {
          _: {
            proposal: {
              _: {
                expiration: {},
              },
            },
          },
          exact: true,
        })
      ) {
        throw new Error(
          `invalid proposal response: ${JSON.stringify(response)}`
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
        `Error retrieving expiration for ${getProposalId(
          proposalModuleAddress,
          proposalNumber
        )}: ${err instanceof Error ? err.message : `${err}`}`
      );
      return;
    }

    proposal = Proposal.create({
      id: getProposalId(proposalModuleAddress, proposalNumber),
      moduleId: proposalModuleAddress,
      num: proposalNumber,
      open: shouldBeOpen,
      expiresAtDate,
      expiresAtHeight,
      createdAt: blockDate,
    });
    await proposal.save();
  }

  // Update proposal open status if necessary.
  if (proposal.open !== shouldBeOpen) {
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

// Find attribute from output log taking into account message index within the
// greater tx object.
const findLogAttribute = (
  { idx, tx }: CosmosMessage,
  eventType: string,
  attributeKey: string
) => {
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

  // First event has no msg_index field set.
  const targetIdx = idx === 0 ? undefined : idx;
  const events = log.find(({ msg_index }) => msg_index === targetIdx)?.events;

  const eventAttributes =
    events?.find(({ type }) => type === eventType)?.attributes ?? [];
  return eventAttributes.find(({ key }) => key === attributeKey)?.value;
};

export async function handlePropose(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: {
        contract,
        msg: { propose },
      },
    },
  } = cosmosMessage;

  // cw-proposal-single and cw-proposal-multiple supported
  if (
    !objectKeyLayoutMatchesSchema(propose, {
      _: {
        title: {},
        description: {},
      },
    })
  ) {
    return;
  }

  let proposalNumber: number;
  try {
    proposalNumber = Number(
      findLogAttribute(cosmosMessage, "wasm", "proposal_id")
    );
    if (isNaN(proposalNumber)) {
      throw new Error(
        `proposalNumber (${JSON.stringify(proposalNumber)}) is NaN`
      );
    }
  } catch (err) {
    logger.error(
      `----- ${contract} > ${proposalNumber} ==> Failed to retrieve proposalNumber during propose: ${
        err instanceof Error ? err.message : `${err}`
      }`
    );
    return;
  }

  // Make proposal (creates module as well).
  if (
    await updateOrCreateAndGetProposal(
      contract,
      proposalNumber,
      true,
      new Date(header.time)
    )
  ) {
    logger.info(`----- ${contract} > ${proposalNumber} ==> Proposed`);
  } else {
    logger.info(
      `----- ${contract} > ${proposalNumber} ==> Failed during propose`
    );
  }
}

export async function handleVote(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: {
        contract,
        sender,
        msg: { vote },
      },
    },
  } = cosmosMessage;

  // cw-proposal-single and cw-proposal-multiple supported
  if (
    !objectKeyLayoutMatchesSchema(vote, {
      _: {
        proposal_id: {},
        vote: {},
      },
      exact: true,
    })
  ) {
    return;
  }

  const blockDate = new Date(header.time);
  const proposalNumber = Number(vote.proposal_id);

  let proposalOpen: boolean;
  try {
    const status = findLogAttribute(cosmosMessage, "wasm", "status");
    if (!status) {
      throw new Error(`status (${JSON.stringify(status)}) is empty`);
    }

    proposalOpen = status === "open";
  } catch (err) {
    logger.error(
      `----- ${contract} > ${proposalNumber} ==> Failed to retrieve status during vote: ${
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
    new Date(header.time)
  );
  if (!proposal) {
    logger.error(
      `----- ${contract} > ${proposalNumber} ==> Failed during vote`
    );
    return;
  }

  // Create and save wallet voted proposal object with timestamp.
  await (
    await ProposalVote.create({
      id: `${proposal.id}:${sender}`,
      walletId: wallet.id,
      proposalId: proposal.id,
      votedAt: blockDate,
    })
  ).save();

  logger.info(
    `----- ${contract} > ${proposalNumber} > ${sender} ==> Voted (open: ${proposalOpen})`
  );
}

export async function handleExecute({
  block: {
    block: { header },
  },
  msg: {
    decodedMsg: {
      contract,
      msg: { execute },
    },
  },
}: CosmosMessage<DecodedMsg>): Promise<void> {
  // cw-proposal-single and cw-proposal-multiple supported
  if (
    !objectKeyLayoutMatchesSchema(execute, {
      _: {
        proposal_id: {},
      },
      exact: true,
    })
  ) {
    return;
  }

  const proposalNumber = Number(execute.proposal_id);
  const proposal = await Proposal.get(getProposalId(contract, proposalNumber));
  if (!proposal) {
    logger.error(
      `----- ${contract} > ${proposalNumber} ==> Failed to find proposal during execute`
    );
    return;
  }

  proposal.open = false;
  proposal.executedAt = new Date(header.time);
  await proposal.save();

  logger.info(`----- ${contract} > ${proposalNumber} ==> Executed`);
}

export async function handleClose({
  block: {
    block: { header },
  },
  msg: {
    decodedMsg: {
      contract,
      msg: { close },
    },
  },
}: CosmosMessage<DecodedMsg>): Promise<void> {
  // cw-proposal-single and cw-proposal-multiple supported
  if (
    !objectKeyLayoutMatchesSchema(close, {
      _: {
        proposal_id: {},
      },
      exact: true,
    })
  ) {
    return;
  }

  const proposalNumber = Number(close.proposal_id);
  const proposal = await Proposal.get(getProposalId(contract, proposalNumber));
  if (!proposal) {
    logger.error(
      `----- ${contract} > ${proposalNumber} ==> Failed to find proposal during close`
    );
    return;
  }

  proposal.open = false;
  proposal.closedAt = new Date(header.time);
  await proposal.save();

  logger.info(`----- ${contract} > ${proposalNumber} ==> Closed`);
}
