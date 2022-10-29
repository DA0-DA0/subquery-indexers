import { BlockHeader } from '@cosmjs/stargate'
import { findAttribute } from '@cosmjs/stargate/build/logs'
import { CosmosMessage } from '@subql/types-cosmos'

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
  // v2
  dao_uri?: string | null
}

interface DumpedState {
  // v2
  admin?: string | null
  // v1 and v2
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

interface UpdateConfig {
  update_config: {
    config: Config
  }
}

const dumpStateWithBlock = async (
  coreAddress: string
): Promise<
  | {
      dumpedState: DumpedState
      header: BlockHeader
    }
  | undefined
> => {
  // Get all DAO state for admin and config from chain.
  let dumpedState: DumpedState
  let header: BlockHeader
  try {
    dumpedState = await api.queryContractSmart(coreAddress, {
      dump_state: {},
    })
    // v1 and v2 both contain `config`
    if (
      !dumpedState ||
      !('config' in dumpedState) ||
      !dumpedState.config ||
      !('name' in dumpedState.config) ||
      !('description' in dumpedState.config)
    ) {
      throw new Error(
        `dumped state ${JSON.stringify(
          dumpedState
        )} does not look like a cw-core dump state response`
      )
    }

    header = await (await api.getBlock()).header
  } catch (err) {
    logger.error(
      `Error retrieving dumpedState or block header for ${coreAddress} during creating non-existent DAO: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return undefined
  }

  return {
    dumpedState,
    header,
  }
}

const getOrCreateDao = async (
  coreAddress: string
): Promise<Dao | undefined> => {
  let dao = await Dao.get(coreAddress)

  if (!dao) {
    const dumpedStateWithBlock = await dumpStateWithBlock(coreAddress)
    if (!dumpedStateWithBlock) {
      return
    }

    const {
      dumpedState: { admin, config, created_timestamp },
      header,
    } = dumpedStateWithBlock

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
      infoUpdatedAt: new Date(header.time),
      infoUpdatedHeight: BigInt(header.height),
    })

    // Create parent DAO if doesn't exist.
    if (admin && (await getOrCreateDao(admin))) {
      dao.parentDaoId = admin
      dao.parentDaoUpdatedAt = new Date(header.time)
      dao.parentDaoUpdatedHeight = BigInt(header.height)
    }
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

  if (!('name' in instantiateMsg) || !('description' in instantiateMsg)) {
    throw new Error(
      `instantiate msg ${JSON.stringify(
        instantiateMsg
      )} does not look like a DAO DAO instantiate msg`
    )
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
      infoUpdatedHeight: BigInt(header.height),
    })

    // Create parent DAO if doesn't exist.
    if (instantiateMsg.admin && (await getOrCreateDao(instantiateMsg.admin))) {
      dao.parentDaoId = instantiateMsg.admin
      dao.parentDaoUpdatedAt = new Date(header.time)
      dao.parentDaoUpdatedHeight = BigInt(header.height)
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

  let instantiateMsg: InstantiateMsg
  try {
    instantiateMsg = JSON.parse(
      Buffer.from(instantiate_msg, 'base64').toString('ascii')
    )
    if (
      !instantiateMsg ||
      !('name' in instantiateMsg) ||
      !('description' in instantiateMsg)
    ) {
      throw new Error(
        `instantiate msg ${JSON.stringify(
          instantiateMsg
        )} does not look like a cw-core instantiate msg`
      )
    }
  } catch (err) {
    logger.error(
      `----- ${contract} ==> Error parsing instantiate_msg for core (${coreAddress}) in factory: ${
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
      infoUpdatedHeight: BigInt(header.height),
    })

    // Create parent DAO if doesn't exist.
    if (instantiateMsg.admin && (await getOrCreateDao(instantiateMsg.admin))) {
      dao.parentDaoId = instantiateMsg.admin
      dao.parentDaoUpdatedAt = new Date(header.time)
      dao.parentDaoUpdatedHeight = BigInt(header.height)
    }
  }
  await dao.save()

  logger.info(`----- ${coreAddress} ==> Instantiated (factory: ${contract})`)
}

export async function handleUpdateConfig(
  cosmosMessage: CosmosMessage<DecodedMsg<UpdateConfig>>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: {
        contract,
        msg: {
          update_config: { config },
        },
      },
    },
  } = cosmosMessage

  const dao = await getOrCreateDao(contract)
  if (!dao) {
    logger.error(
      `----- ${contract} ==> Error creating DAO during update_config`
    )
    return
  }

  if (!config) {
    logger.error(
      `----- ${contract} ==> DAO config object empty during update_config`
    )
    return
  }

  // Only update DAO if its info was most recently updated before this block.
  // This may happen if a parent DAO was instantiated before the indexer's first
  // block but was added to this indexer as a result of one of its subDAOs'
  // instantiations (since we create parent DAOs using manual queries when
  // possible), for example.
  if (dao.infoUpdatedHeight < header.height) {
    dao.name = config.name
    dao.description = config.description
    dao.imageUrl = config.image_url ?? undefined
    dao.daoUri = config.dao_uri ?? undefined
    dao.infoUpdatedAt = new Date(header.time)
    dao.infoUpdatedHeight = BigInt(header.height)

    await dao.save()
    logger.info(`----- ${contract} ==> Updated config`)
  } else {
    logger.error(
      `----- ${contract} ==> Info already newer during update_config`
    )
  }
}

export async function handleUpdateAdmin(
  cosmosMessage: CosmosMessage<DecodedMsg>
): Promise<void> {
  const {
    block: {
      block: { header },
    },
    msg: {
      decodedMsg: { contract },
    },
    tx: {
      tx: { log },
    },
  } = cosmosMessage

  const dao = await getOrCreateDao(contract)
  if (!dao) {
    logger.error(`----- ${contract} ==> Error creating DAO during update_admin`)
    return
  }
  // Only update DAO admin if its admin was most recently updated before this
  // block. This may happen if a parent DAO was instantiated with an admin
  // before the indexer's first block but was added to this indexer as a result
  // of one of its subDAOs' instantiations (since we create parent DAOs using
  // manual queries when possible), for example.
  if (
    dao.parentDaoUpdatedHeight &&
    dao.parentDaoUpdatedHeight >= header.height
  ) {
    logger.error(
      `----- ${contract} ==> Parent DAO already newer during update_admin`
    )
    return
  }

  let newAdmin: string
  try {
    newAdmin = findAttribute(JSON.parse(log), 'wasm', 'new_admin').value
    if (!newAdmin) {
      throw new Error(`newAdmin (${JSON.stringify(newAdmin)}) empty`)
    }
  } catch (err) {
    logger.error(
      `Error retrieving newAdmin for ${contract}: ${
        err instanceof Error ? err.message : `${err}`
      }`
    )
    return
  }

  // Create parent DAO if doesn't exist.
  if (await getOrCreateDao(newAdmin)) {
    dao.parentDaoId = newAdmin
    dao.parentDaoUpdatedAt = new Date(header.time)
    dao.parentDaoUpdatedHeight = BigInt(header.height)
    await dao.save()
    logger.info(`----- ${contract} ==> Parent DAO updated to ${newAdmin}`)
  } else {
    logger.error(
      `----- ${contract} ==> Error creating parent DAO (${newAdmin}) during update_admin`
    )
  }
}
