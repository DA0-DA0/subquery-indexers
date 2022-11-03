import { findAttribute } from '@cosmjs/stargate/build/logs'
import { CosmosEvent, CosmosMessage } from '@subql/types-cosmos'

import { findContractAddressesForActionEvent } from '../findContractAddressesForActionEvent'
import { objectMatchesStructure } from '../objectMatchesStructure'
import { Dao } from '../types'

interface DecodedMsg<T extends any = any> {
  sender: string
  contract: string
  msg: T
  funds: {
    denom: string
    amount: string
  }[]
}

interface Config {
  // v1 and v2
  name: string
  description: string
  image_url?: string | null
  automatically_add_cw20s: boolean
  automatically_add_cw721s: boolean
  // v2
  dao_uri?: string | null
}

interface DumpedState {
  // v1 and v2
  admin?: string | null
  config: Config
  // v2
  created_timestamp?: string | null
}

interface InstantiateContractWithSelfAdmin {
  instantiate_contract_with_self_admin: {
    code_id: number
    instantiate_msg: string
    label: string
  }
}

interface InstantiateMsg extends Config {
  admin?: string | null
}

const dumpState = async (
  coreAddress: string
): Promise<DumpedState | undefined> => {
  // Get all DAO state for admin and config from chain.
  let dumpedState: DumpedState
  try {
    dumpedState = await api.queryContractSmart(coreAddress, {
      dump_state: {},
    })
    // v1 and v2 both contain `config` and all these fields.
    if (
      !objectMatchesStructure(dumpedState, {
        config: {
          name: {},
          description: {},
          automatically_add_cw20s: {},
          automatically_add_cw721s: {},
        },
      })
    ) {
      throw new Error(
        `dumped state response ${JSON.stringify(dumpedState)} not recognized`
      )
    }
  } catch (err) {
    logger.error(
      `Error retrieving dumpedState or block header for ${coreAddress} during creating non-existent DAO: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return undefined
  }

  return dumpedState
}

const getOrCreateDao = async (
  coreAddress: string
): Promise<Dao | undefined> => {
  let dao = await Dao.get(coreAddress)

  if (!dao) {
    const dumpedStateWithBlock = await dumpState(coreAddress)
    if (!dumpedStateWithBlock) {
      return
    }

    const { admin, config, created_timestamp } = dumpedStateWithBlock

    const timestamp = new Date()

    dao = Dao.create({
      id: coreAddress,
      name: config.name,
      description: config.description,
      imageUrl: config.image_url ?? undefined,
      // All v2 DAOs should be indexed, and only v2 DAOs allow us to reliably
      // access their created timestamp, so it's fine if this doesn't exist. It
      // shouldn't happen often.
      created: created_timestamp ? new Date(created_timestamp) : undefined,
      daoUri: config.dao_uri ?? undefined,
      infoUpdatedAt: timestamp,
    })

    // Create parent DAO if doesn't exist.
    if (admin && (await getOrCreateDao(admin))) {
      dao.parentDaoId = admin
      dao.parentDaoUpdatedAt = timestamp
    }

    await dao.save()
  }

  return dao
}

export async function handleInstantiate(
  cosmosMessage: CosmosMessage<DecodedMsg<InstantiateMsg>>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: { msg: instantiateMsg },
    },
    tx: {
      hash,
      tx: { log },
    },
  } = cosmosMessage

  // v1 and v2 both contain all these fields. If structure does not match, fail
  // silently.
  if (
    !objectMatchesStructure(instantiateMsg, {
      name: {},
      description: {},
      automatically_add_cw20s: {},
      automatically_add_cw721s: {},
    })
  ) {
    return
  }

  let coreAddress: string
  try {
    coreAddress = findAttribute(
      JSON.parse(log),
      'instantiate',
      '_contract_address'
    ).value
    if (!coreAddress) {
      throw new Error(`coreAddress (${JSON.stringify(coreAddress)}) empty`)
    }
  } catch (err) {
    logger.error(
      `----- ${hash} ==> Error retrieving coreAddress during instantiate: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return
  }

  // It should never exist at this point if we index in order of old to new
  // block height, but why not be safe. If it does happen to exist, update its
  // created timestamp since this is its instantiation.
  let dao = await Dao.get(coreAddress)
  if (dao) {
    dao.created = new Date(header.time)
  } else if (!dao) {
    dao = Dao.create({
      id: coreAddress,
      name: instantiateMsg.name,
      description: instantiateMsg.description,
      imageUrl: instantiateMsg.image_url ?? undefined,
      created: new Date(header.time),
      daoUri: instantiateMsg.dao_uri ?? undefined,
      infoUpdatedAt: new Date(header.time),
    })

    // Create parent DAO if doesn't exist.
    if (instantiateMsg.admin && (await getOrCreateDao(instantiateMsg.admin))) {
      dao.parentDaoId = instantiateMsg.admin
      dao.parentDaoUpdatedAt = new Date(header.time)
    }
  }
  await dao.save()

  logger.info(`----- ${coreAddress} ==> Instantiated`)
}

export async function handleInstantiateFactory(
  cosmosMessage: CosmosMessage<DecodedMsg<InstantiateContractWithSelfAdmin>>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: {
        contract,
        msg: {
          instantiate_contract_with_self_admin: { instantiate_msg },
        },
      },
    },
    tx: {
      tx: { log },
    },
  } = cosmosMessage

  let instantiateMsg: InstantiateMsg
  try {
    instantiateMsg = JSON.parse(
      Buffer.from(instantiate_msg, 'base64').toString('ascii')
    )
    // v1 and v2 both contain all these fields. If structure does not match,
    // fail silently.
    if (
      !objectMatchesStructure(instantiateMsg, {
        name: {},
        description: {},
        automatically_add_cw20s: {},
        automatically_add_cw721s: {},
      })
    ) {
      return
    }
  } catch (err) {
    logger.error(
      `----- ${contract} ==> Error parsing instantiate_msg in factory: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return
  }

  let coreAddress: string
  try {
    coreAddress = findAttribute(
      JSON.parse(log),
      'instantiate',
      '_contract_address'
    ).value
    if (!coreAddress) {
      throw new Error(`coreAddress (${JSON.stringify(coreAddress)}) empty`)
    }
  } catch (err) {
    logger.error(
      `----- ${contract} ==> Error retrieving coreAddress during instantiate: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return
  }

  // It should never exist at this point if we index in order of old to new
  // block height, but why not be safe. If it does happen to exist, update its
  // created timestamp since this is its instantiation.
  let dao = await Dao.get(coreAddress)
  if (dao) {
    dao.created = new Date(header.time)
  } else if (!dao) {
    dao = Dao.create({
      id: coreAddress,
      name: instantiateMsg.name,
      description: instantiateMsg.description,
      imageUrl: instantiateMsg.image_url ?? undefined,
      created: new Date(header.time),
      daoUri: instantiateMsg.dao_uri ?? undefined,
      infoUpdatedAt: new Date(header.time),
    })

    // Create parent DAO if doesn't exist.
    if (instantiateMsg.admin && (await getOrCreateDao(instantiateMsg.admin))) {
      dao.parentDaoId = instantiateMsg.admin
      dao.parentDaoUpdatedAt = new Date(header.time)
    }
  }
  await dao.save()

  logger.info(`----- ${coreAddress} ==> Instantiated (factory: ${contract})`)
}

// Listen for events in transaction events to determine when to update existing
// state from the chain. Most state updates to DAOs occur via executed proposals
// (and thus smart contract submessages), and submessages only appear in the
// chain as events.

export const handleUpdateConfigEvent = async ({ tx }: CosmosEvent) => {
  const coreAddressesWithUpdatedConfig = findContractAddressesForActionEvent(
    tx.tx.events,
    'execute_update_config'
  )
  if (coreAddressesWithUpdatedConfig.length === 0) {
    return
  }

  for (const coreAddress of coreAddressesWithUpdatedConfig) {
    // Ensure DAO exists.
    const dao = await Dao.get(coreAddress)
    if (!dao) {
      return
    }

    // Get latest state of DAO config. We can't get the state at an intermediary
    // block, so just update to the latest state if we see an event.
    const dumpedState = await dumpState(coreAddress)
    if (!dumpedState) {
      logger.error(
        `----- ${coreAddress} ==> Failed to dump state when updating config`
      )
      return
    }

    const { config } = dumpedState

    dao.name = config.name
    dao.description = config.description
    dao.imageUrl = config.image_url ?? undefined
    dao.daoUri = config.dao_uri ?? undefined
    dao.infoUpdatedAt = new Date()

    await dao.save()

    logger.info(`----- ${coreAddress} ==> Updated config`)
  }
}

export const handleUpdateAdminEvent = async ({ tx }: CosmosEvent) => {
  const coreAddressesWithUpdatedAdmin = findContractAddressesForActionEvent(
    tx.tx.events,
    'execute_accept_admin_nomination'
  )
  if (coreAddressesWithUpdatedAdmin.length === 0) {
    return
  }

  for (const coreAddress of coreAddressesWithUpdatedAdmin) {
    // Ensure DAO exists.
    const dao = await Dao.get(coreAddress)
    if (!dao) {
      return
    }

    // Get latest state of DAO config. We can't get the state at an intermediary
    // block, so just update to the latest state if we see an event.
    const dumpedState = await dumpState(coreAddress)
    if (!dumpedState) {
      logger.error(
        `----- ${coreAddress} ==> Failed to dump state when updating admin`
      )
      return
    }

    const { admin } = dumpedState

    // Create parent DAO if doesn't exist. If not a DAO, fail silently.
    if (await getOrCreateDao(admin)) {
      dao.parentDaoId = admin
      dao.parentDaoUpdatedAt = new Date()
    }

    await dao.save()

    logger.info(`----- ${coreAddress} ==> Updated admin`)
  }
}
