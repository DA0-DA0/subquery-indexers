// Auto-generated , DO NOT EDIT
import assert from 'assert'

import { Entity, FunctionPropertyNames } from '@subql/types-cosmos'

type SnapshotProps = Omit<
  Snapshot,
  NonNullable<FunctionPropertyNames<Snapshot>>
>

export class Snapshot implements Entity {
  constructor(id: string) {
    this.id = id
  }

  public id: string

  public addr: string

  public contract: string

  public blockHeight: bigint

  public amount: bigint

  async save(): Promise<void> {
    let id = this.id
    assert(id !== null, 'Cannot save Snapshot entity without an ID')
    await store.set('Snapshot', id.toString(), this)
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove Snapshot entity without an ID')
    await store.remove('Snapshot', id.toString())
  }

  static async get(id: string): Promise<Snapshot | undefined> {
    assert(
      id !== null && id !== undefined,
      'Cannot get Snapshot entity without an ID'
    )
    const record = await store.get('Snapshot', id.toString())
    if (record) {
      return Snapshot.create(record as SnapshotProps)
    } else {
      return
    }
  }

  static async getByAddr(addr: string): Promise<Snapshot[] | undefined> {
    const records = await store.getByField('Snapshot', 'addr', addr)
    return records.map((record) => Snapshot.create(record as SnapshotProps))
  }

  static async getByContract(
    contract: string
  ): Promise<Snapshot[] | undefined> {
    const records = await store.getByField('Snapshot', 'contract', contract)
    return records.map((record) => Snapshot.create(record as SnapshotProps))
  }

  static async getByBlockHeight(
    blockHeight: bigint
  ): Promise<Snapshot[] | undefined> {
    const records = await store.getByField(
      'Snapshot',
      'blockHeight',
      blockHeight
    )
    return records.map((record) => Snapshot.create(record as SnapshotProps))
  }

  static create(record: SnapshotProps): Snapshot {
    assert(typeof record.id === 'string', 'id must be provided')
    let entity = new Snapshot(record.id)
    Object.assign(entity, record)
    return entity
  }
}
