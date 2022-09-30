// Auto-generated , DO NOT EDIT
import assert from 'assert'

import { Entity, FunctionPropertyNames } from '@subql/types-cosmos'

type WasmswapProps = Omit<
  Wasmswap,
  NonNullable<FunctionPropertyNames<Wasmswap>>
>

export class Wasmswap implements Entity {
  constructor(id: string) {
    this.id = id
  }

  public id: string

  public contract: string

  public token1Amount: bigint

  public token2Amount: bigint

  async save(): Promise<void> {
    let id = this.id
    assert(id !== null, 'Cannot save Wasmswap entity without an ID')
    await store.set('Wasmswap', id.toString(), this)
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove Wasmswap entity without an ID')
    await store.remove('Wasmswap', id.toString())
  }

  static async get(id: string): Promise<Wasmswap | undefined> {
    assert(
      id !== null && id !== undefined,
      'Cannot get Wasmswap entity without an ID'
    )
    const record = await store.get('Wasmswap', id.toString())
    if (record) {
      return Wasmswap.create(record as WasmswapProps)
    } else {
      return
    }
  }

  static async getByContract(
    contract: string
  ): Promise<Wasmswap[] | undefined> {
    const records = await store.getByField('Wasmswap', 'contract', contract)
    return records.map((record) => Wasmswap.create(record as WasmswapProps))
  }

  static create(record: WasmswapProps): Wasmswap {
    assert(typeof record.id === 'string', 'id must be provided')
    let entity = new Wasmswap(record.id)
    Object.assign(entity, record)
    return entity
  }
}
