import { Event as TxEvent } from '@cosmjs/tendermint-rpc'

// encoded from utf-8 strings 'action' and '_contract_address'
const ACTION_KEY_UINT8_ARRAY = Uint8Array.from([97, 99, 116, 105, 111, 110])
const CONTRACT_ADDRESS_KEY_UINT8_ARRAY = Uint8Array.from([
  95, 99, 111, 110, 116, 114, 97, 99, 116, 95, 97, 100, 100, 114, 101, 115, 115,
])

export const findContractAddressesForActionEvent = (
  events: readonly TxEvent[],
  action: string
): string[] => {
  const wasmEvents = events.filter(
    ({ type: eventType }) => eventType === 'wasm'
  )
  if (!wasmEvents.length) {
    return []
  }

  return (
    wasmEvents
      // Check attribute with key 'action' matches the desired value, and also
      // that key '_contract_address' is present.
      .filter(({ attributes }) => {
        const actionAttribute = attributes.find(
          ({ key }) => key.join(',') === ACTION_KEY_UINT8_ARRAY.join(',')
        )
        const hasContractAddressAttribute = attributes.some(
          ({ key, value }) =>
            key.join(',') === CONTRACT_ADDRESS_KEY_UINT8_ARRAY.join(',') &&
            value.length > 0
        )
        if (!actionAttribute || !hasContractAddressAttribute) {
          return false
        }

        const decodedAction = Buffer.from(actionAttribute.value).toString(
          'utf-8'
        )
        return decodedAction === action
      })
      // Decode the value for key '_contract_address'.
      .map(({ attributes }) => {
        const contractAddress = Buffer.from(
          attributes.find(
            ({ key }) =>
              key.join(',') === CONTRACT_ADDRESS_KEY_UINT8_ARRAY.join(',')
          ).value
        ).toString('utf-8')

        return contractAddress
      })
  )
}
