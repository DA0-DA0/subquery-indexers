import { Event } from '@cosmjs/stargate/build/logs'
import { CosmosMessage } from '@subql/types-cosmos'

// Find attribute from output log taking into account message index within the
// greater tx object.
export const findLogAttribute = (
  { idx, tx }: CosmosMessage,
  eventType: string,
  attributeKey: string
) => {
  let log: {
    msg_index?: number
    events: Event[]
  }[]
  try {
    log = JSON.parse(tx.tx.log)
  } catch (e) {
    logger.warn(`failed to parse log: (${e})`)
    return
  }

  // First event has no msg_index field set.
  const targetIdx = idx === 0 ? undefined : idx
  const events = log.find(({ msg_index }) => msg_index === targetIdx)?.events

  const eventAttributes =
    events?.find(({ type }) => type === eventType)?.attributes ?? []
  return eventAttributes.find(({ key }) => key === attributeKey)?.value
}
