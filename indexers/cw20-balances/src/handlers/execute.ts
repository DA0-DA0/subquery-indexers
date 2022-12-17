import { CosmosMessage } from "@subql/types-cosmos";
import { ExecuteMsg, CW20Actions, WhitelistedCodeIds } from "../shared";
import { Attribute, Log } from "@cosmjs/stargate/build/logs";
import { Event as WasmEvent, TransactionDispatcher, WasmMsg } from "../shared";

// logic: buildWasmEvents will filter log.events for type `wasm`
// and iterate through each of the event's attributes
// for each _contract_address detected, it will create a new `WasmEvent`
// and if it's currently building an event, then we store it.
// THIS HAS A LOT OF DEPENDENCY ON BEING AN ORDERED ARRAY
// afterwards it'll pass those events to determine if they are eligible to be indexed
// or ignored. this depends on if the event.contract is a cw20 or if one of the targetted
// actions in the wasm event is
export async function HandleExecute(message: CosmosMessage<ExecuteMsg<any>>) {
    logger.info(`##----- START HandleExecute`);
    const wasmEvents = buildWasmEvents(message.tx.tx.log);
    await eventWrapper(message, wasmEvents);
    logger.info(`##----- EXIT HandleExecute`);
}

// iterate through log events of type `wasm` and check its attributes
// assuming these are in order, you'll see breakpoints at each new
// `_contract_address` record
const buildWasmEvents = (log: string) => {
    const logs: Log[] = JSON.parse(log);

    const attributes =
        logs[0]?.events?.find(({ type }) => type === "wasm")?.attributes ?? [];

    let wasmEvents: WasmEvent[] = [];

    let event: WasmEvent = undefined;
    for (const attr of attributes) {
        if (attr.key == "_contract_address") {
            if (event !== undefined) {
                wasmEvents.push(event);
            }

            event = new WasmEvent("wasm", attr.value);
        }

        if (attr.key == "action") {
            event.action = attr.value;
        }

        event.attributes.push(Object.assign({}, attr));
    }

    wasmEvents.push(event);

    return wasmEvents;
};

// idea is, loop through each event, validate it is a valid action and valid cw20 contract
// then pass to dispatcher to figure out what is necessary, then fire it off
const eventWrapper = async (
    message: CosmosMessage<ExecuteMsg<any>>,
    events: WasmEvent[]
) => {
    // check the body's execute msg matches one of our wasm msgs
    // currently built for `stake`
    const bodyWasmMsg: WasmMsg = getBodyMsgTargetExecuteMsg(
        message.msg.decodedMsg.msg,
        undefined
    );
    // this should be the cw20 contractAddr
    let primaryTargetContractAddr: string = undefined;

    // this is a secondary contractAddr where the tokens were sent off to
    // eg `stake` or add liquidity to Junoswap
    let secondaryTargetContractAddr: string =
        bodyWasmMsg && bodyWasmMsg.contract ? bodyWasmMsg.contract : undefined;

    for (const event of events) {
        logger.info(`##----- event: ${JSON.stringify(event)}`);
        if ((event.action ?? "") === "" || !CW20Actions[event.action]) {
            continue;
        }

        logger.info(`##----- bodyWasmMsg: ${JSON.stringify(bodyWasmMsg)}`);

        // grab codeId to ensure it is on our whitelist. if our event is NOT the body action
        // otherwise for stake, we bypass this check as the primaryTargetContractAddr has
        // already been established
        if (CW20Actions[event.action] !== CW20Actions[bodyWasmMsg?.action]) {
            const { codeId: contractCodeId } = await api.getContract(
                event.contract
            );

            if (!WhitelistedCodeIds.get(contractCodeId)) {
                logger.info(`##----- EARLY END HandleSend: ${message.tx.hash}`);
                return;
            }

            primaryTargetContractAddr =
                primaryTargetContractAddr ?? event.contract;
        }

        await eventDispatcher(
            message,
            event,
            primaryTargetContractAddr,
            secondaryTargetContractAddr
        );
    }
};

// attempt to build out the tx body's msg as a targetted wasm event
// currently built for `stake` as this triggers subevents
const getBodyMsgTargetExecuteMsg = (msg: string, wasmMsg: WasmMsg) => {
    // B98D144A5569FBC1EEFC1EF7712575243AABE441976EC6E3FF4D5C24D7BC41BF
    // {"send":
    //  {"amount":"6121754157",
    //  "contract":"juno1qm087c2wrlzsaskv3kngcmuamsha77vxgkkpgeqkrzemtpe95uhsjc65hh"
    //  "msg":"eyJzdGFrZSI6IHt9fQ=="}}

    let _wasmMsg: WasmMsg = wasmMsg;

    let _msg = msg.toString().replace(/\\"/g, '"');
    _msg = _msg.replace(/\s/g, "");

    switch (_msg) {
        case '{"stake":{}}':
            _wasmMsg.action = CW20Actions[CW20Actions.stake];
            break;
        default:
            break;
    }

    if (!_wasmMsg?.action) {
        try {
            const genericMsg = msg as unknown as Record<string, WasmMsg>;

            const keys = Object.keys(genericMsg);

            for (const key of keys) {
                if (
                    CW20Actions[key] &&
                    genericMsg[key] &&
                    genericMsg[key].msg
                ) {
                    _wasmMsg = Object.assign({}, genericMsg[key]);
                    _wasmMsg.action = key;

                    const base64 = genericMsg[key].msg;
                    const buf = Buffer.from(base64, "base64");

                    try {
                        _msg = JSON.parse(buf.toString());
                    } catch (e) {
                        logger.error(
                            `getBodyMsgTargetExecuteMsg - parse error: ${e}`
                        );
                        _msg = "";
                    }

                    _msg = JSON.stringify(_msg).replace(/\\"/g, '"');
                    return getBodyMsgTargetExecuteMsg(_msg, _wasmMsg);
                }
            }
        } catch (e) {
            logger.error(`getBodyMsgTargetExecuteMsg - conversion error ${e}`);
        }
    }

    return _wasmMsg;
};

// acts as an orchestrator as it builds out entity loggers
const eventDispatcher = async (
    message: CosmosMessage<ExecuteMsg<any>>,
    event: WasmEvent,
    primaryCW20ContractAddr: string,
    targetContractAddr: string
) => {
    const blockHeight = BigInt(message.block.block.header.height);
    const txHash = message.tx.hash;
    let contractAddr =
        primaryCW20ContractAddr ?? message.msg.decodedMsg.contract;
    let txType: CW20Actions = CW20Actions[event.action];
    let addrFrom: string = undefined;
    let addrTo: string = undefined;
    let amount: bigint = BigInt(0);
    let stakedAmount: bigint = BigInt(0);

    logger.info(`##----- eventDispatcher-event ${JSON.stringify(event)}`);

    switch (txType) {
        case CW20Actions.mint:
            addrTo = getAttributeValue(event.attributes, "to");
            amount = BigInt(getAttributeValue(event.attributes, "amount"));
            break;
        case CW20Actions.transfer:
            addrFrom = getAttributeValue(event.attributes, "from");
            addrTo = getAttributeValue(event.attributes, "to");
            amount = BigInt(getAttributeValue(event.attributes, "amount"));
            break;
        case CW20Actions.send:
            addrFrom = message.msg.decodedMsg.sender;
            addrTo = getAttributeValue(event.attributes, "to");
            amount = BigInt(getAttributeValue(event.attributes, "amount"));

            if (event.contract !== contractAddr) {
                logger.fatal(
                    `##----- event contract address does not match cw20 contract addr - ` +
                        `event.contract: ${event.contract}, contractAddr: ${contractAddr}`
                );
                return;
            }

            if (targetContractAddr && targetContractAddr !== addrTo) {
                logger.info(`##----- event - send: ${event}`);
                logger.fatal(
                    `##----- targetContractAddr does not match action destination - ` +
                        `action: ${CW20Actions.send}, targetContractAddr: ${targetContractAddr}, addrTo: ${addrTo}`
                );
                return;
            }
            break;
        case CW20Actions.stake:
            addrFrom = getAttributeValue(event.attributes, "from");
            // set addrTo to the affected contract
            addrTo = getAttributeValue(event.attributes, "_contract_address");
            stakedAmount = BigInt(
                getAttributeValue(event.attributes, "amount")
            );

            if (targetContractAddr !== addrTo) {
                logger.info(`##----- event - stake: ${JSON.stringify(event)}`);
                logger.fatal(
                    `##----- targetContractAddress does not match action destination - ` +
                        `action: ${CW20Actions.send}, targetContractAddr: ${targetContractAddr}, addrTo: ${addrTo}`
                );
                return;
            }
            break;
        default:
            break;
    }

    await TransactionDispatcher(
        txType,
        contractAddr,
        addrFrom,
        addrTo,
        blockHeight,
        txHash,
        amount,
        stakedAmount
    );
};

const getAttributeValue = (attributes: Attribute[], key: string) => {
    return attributes.find((item) => {
        return item.key === key;
    })?.value;
};
