export const WhitelistedCodeIds = new Map<number, boolean>([
    //[1, true], // cw20 - NETA
    [435, true], // cw20 - DAO
    //[448, true], // cw20 - DOG
]);

export enum CW20Actions {
    transfer = 1,
    burn,
    send,
    mint,
    increase_allowance,
    decrease_allowance,
    transfer_from,
    burn_from,
    send_from,

    stake,
    unstake,
}

export interface Attribute {
    key: string;
    value: string;
}

export class Event {
    constructor(type: string, contract: string) {
        this.type = type;
        this.contract = contract;
        this.action = undefined;
        this.attributes = [];
    }

    public type: string;
    public contract: string;
    public action: string;
    public attributes: Attribute[];
}

export interface ExecuteMsg<T> {
    sender: string;
    contract: string;
    msg: T;
    funds: { amount: string; denom: string }[];
}

export interface InstantiateCW20Msg {
    decimals: number;
    initial_balances: { address: string; amount: string }[];
}

export interface GenericMsg<T = any> {
    key: T;
}

export interface WasmMsg {
    action: string;
    contract: string;
    amount: string;
    msg: string;
}
