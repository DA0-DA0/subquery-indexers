import { Event as CosmjsStargateEvent } from '@cosmjs/stargate/build/logs'
import { Event as TxEvent } from '@cosmjs/tendermint-rpc'

interface AttributeMatcher {
  key: string
  // If value not provided, just verifies existence of key.
  value?: string
}

export interface DecodedEvent extends CosmjsStargateEvent {
  contractAddress: string
}

export const findMatchingWasmEventAndDecode = (
  events: readonly TxEvent[],
  attributeMatchers: AttributeMatcher[]
): DecodedEvent | undefined => {
  const wasmEvents = events.filter(
    ({ type: eventType }) => eventType === 'wasm'
  )
  if (!wasmEvents.length) {
    return
  }

  for (const event of wasmEvents) {
    const decodedAttributes: DecodedEvent['attributes'] = event.attributes.map(
      ({ key, value }) => ({
        key: Buffer.from(key).toString('utf-8'),
        value: Buffer.from(value).toString('utf-8'),
      })
    )

    const eventMatches = attributeMatchers.every((matcher) =>
      decodedAttributes.some(
        ({ key, value }) =>
          key === matcher.key &&
          (matcher.value === undefined || value === matcher.value)
      )
    )

    if (!eventMatches) {
      continue
    }

    const contractAddress =
      decodedAttributes.find(({ key }) => key === '_contract_address')?.value ??
      ''

    return {
      ...event,
      contractAddress,
      attributes: decodedAttributes,
    }
  }
}
