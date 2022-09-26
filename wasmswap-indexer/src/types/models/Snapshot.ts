// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




type SnapshotProps = Omit<Snapshot, NonNullable<FunctionPropertyNames<Snapshot>>>;

export class Snapshot implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public contract: string;

    public blockHeight: bigint;

    public token1Amount: bigint;

    public token2Amount: bigint;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Snapshot entity without an ID");
        await store.set('Snapshot', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Snapshot entity without an ID");
        await store.remove('Snapshot', id.toString());
    }

    static async get(id:string): Promise<Snapshot | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Snapshot entity without an ID");
        const record = await store.get('Snapshot', id.toString());
        if (record){
            return Snapshot.create(record as SnapshotProps);
        }else{
            return;
        }
    }


    static async getByContract(contract: string): Promise<Snapshot | undefined>{
      
      const record = await store.getOneByField('Snapshot', 'contract', contract);
      if (record){
          return Snapshot.create(record as SnapshotProps);
      }else{
          return;
      }
      
    }

    static async getByBlockHeight(blockHeight: bigint): Promise<Snapshot[] | undefined>{
      
      const records = await store.getByField('Snapshot', 'blockHeight', blockHeight);
      return records.map(record => Snapshot.create(record as SnapshotProps));
      
    }


    static create(record: SnapshotProps): Snapshot {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new Snapshot(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
