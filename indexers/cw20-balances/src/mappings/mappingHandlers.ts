import { CosmosMessage } from "@subql/types-cosmos";
import { ExecuteMsg } from "../shared";
import { HandleExecute } from "../handlers";

// DOG DAO proposal `mint` 3A7AC6CA16572E827A99F3251455DF392AE9476413F2F6470A60F19B442771BA
// DOG DAO one is all sorts of messed up and cannot grab initial balances.
// DAODAO `transfer` 84DEBFD305B769D952EEC029BE3F4F3FFD59F7DC9E782B2544683E10CDEC904C
// DAODAO `send` `stake` B98D144A5569FBC1EEFC1EF7712575243AABE441976EC6E3FF4D5C24D7BC41BF

export async function handleExecute(
    message: CosmosMessage<ExecuteMsg<any>>
): Promise<void> {
    if (
        message.tx.hash !=
        "84DEBFD305B769D952EEC029BE3F4F3FFD59F7DC9E782B2544683E10CDEC904C"
    ) {
        //return;
    }

    await HandleExecute(message);
}
