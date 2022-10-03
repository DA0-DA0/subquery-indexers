// Auto-generated , DO NOT EDIT
import assert from 'assert'

import { Entity, FunctionPropertyNames } from '@subql/types-cosmos'

type PoolProps = Omit<Pool, NonNullable<FunctionPropertyNames<Pool>>>

export class Pool implements Entity {
  constructor(id: string) {
    this.id = id
  }

  public id: string

  public contract: string

  public token1Amount: bigint

  public token2Amount: bigint

  async save(): Promise<void> {
    let id = this.id
    assert(id !== null, 'Cannot save Pool entity without an ID')
    await store.set('Pool', id.toString(), this)
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove Pool entity without an ID')
    await store.remove('Pool', id.toString())
  }

  static async get(id: string): Promise<Pool | undefined> {
    assert(
      id !== null && id !== undefined,
      'Cannot get Pool entity without an ID'
    )
    const record = await store.get('Pool', id.toString())
    if (record) {
      return Pool.create(record as PoolProps)
    } else {
      return
    }
  }

  static async getByContract(contract: string): Promise<Pool[] | undefined> {
    const records = await store.getByField('Pool', 'contract', contract)
    return records.map((record) => Pool.create(record as PoolProps))
  }

  static create(record: PoolProps): Pool {
    assert(typeof record.id === 'string', 'id must be provided')
    let entity = new Pool(record.id)
    Object.assign(entity, record)
    return entity
  }
}
