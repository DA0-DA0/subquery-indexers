// Auto-generated , DO NOT EDIT
import assert from 'assert'

import { Entity, FunctionPropertyNames } from '@subql/types'

type BalanceProps = Omit<Balance, NonNullable<FunctionPropertyNames<Balance>>>

export class Balance implements Entity {
  constructor(id: string) {
    this.id = id
  }

  public id: string

  public addr: string

  public contract: string

  public amount: bigint

  async save(): Promise<void> {
    let id = this.id
    assert(id !== null, 'Cannot save Balance entity without an ID')
    await store.set('Balance', id.toString(), this)
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove Balance entity without an ID')
    await store.remove('Balance', id.toString())
  }

  static async get(id: string): Promise<Balance | undefined> {
    assert(
      id !== null && id !== undefined,
      'Cannot get Balance entity without an ID'
    )
    const record = await store.get('Balance', id.toString())
    if (record) {
      return Balance.create(record as BalanceProps)
    } else {
      return
    }
  }

  static async getByAddr(addr: string): Promise<Balance[] | undefined> {
    const records = await store.getByField('Balance', 'addr', addr)
    return records.map((record) => Balance.create(record as BalanceProps))
  }

  static async getByContract(contract: string): Promise<Balance[] | undefined> {
    const records = await store.getByField('Balance', 'contract', contract)
    return records.map((record) => Balance.create(record as BalanceProps))
  }

  static create(record: BalanceProps): Balance {
    assert(typeof record.id === 'string', 'id must be provided')
    let entity = new Balance(record.id)
    Object.assign(entity, record)
    return entity
  }
}
