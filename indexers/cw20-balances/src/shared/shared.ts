import {
    AddSnapshotEntity,
    AddUpdateBalanceEntity,
    AddUpdateTotalBalanceEntity,
} from "./entity";

import { TotalBalance } from "../types";
import { InstantiateCW20Msg, CW20Actions } from "./resources";

const negative: bigint = BigInt(-1);

// second part of the ochestrator that further determines entity stamping logic
export const TransactionDispatcher = async (
    txType: CW20Actions,
    contractAddr: string,
    addrFrom: string,
    addrTo: string,
    blockHeight: bigint,
    txHash: string,
    amount: bigint,
    stakedAmount: bigint
) => {
    // subroutine to validate we've seen contract before, otherwise, make assumption
    // that this was instantiated via a submsg like the DAODAO token was.
    // the instantiation BH is unknown unless we want to walk back to it.
    // Depending on what the graph looks like, we could put these at blockHeight "0"
    await InitializeContractBalances(contractAddr, blockHeight - BigInt(1));

    switch (txType) {
        case CW20Actions.transfer:
            // add snapshot for sender - negative amount, 0 staked
            // add snapshot for recipient - positive amount

            await RecordNewTransaction(
                contractAddr,
                addrFrom,
                blockHeight,
                txHash,
                negative * amount,
                stakedAmount
            );

            await RecordNewTransaction(
                contractAddr,
                addrTo,
                blockHeight,
                txHash,
                amount,
                stakedAmount
            );

            break;
        case CW20Actions.mint:
            await RecordNewTransaction(
                contractAddr,
                addrTo,
                blockHeight,
                txHash,
                amount,
                stakedAmount
            );
            break;
        case CW20Actions.send:
            await RecordNewTransaction(
                contractAddr,
                addrFrom,
                blockHeight,
                txHash,
                negative * amount,
                stakedAmount
            );

            await RecordNewTransaction(
                contractAddr,
                addrTo,
                blockHeight,
                txHash,
                amount,
                stakedAmount
            );
            break;
        case CW20Actions.stake:
            await RecordNewTransaction(
                contractAddr,
                addrFrom,
                blockHeight,
                txHash,
                amount,
                stakedAmount
            );
            break;
        default: {
            logger.fatal(
                `TransactionDispatcher - no action to dispatch: ${txType}`
            );
            break;
        }
    }
};

export const RecordNewTransaction = async (
    contractAddr: string,
    addr: string,
    blockHeight: bigint,
    txHash: string,
    amount: bigint,
    stakedAmount: bigint
) => {
    await AddSnapshotEntity(
        contractAddr,
        addr,
        blockHeight,
        txHash,
        amount,
        stakedAmount
    );

    await AddUpdateBalanceEntity(contractAddr, addr, amount, stakedAmount);
};

// juno1pqht3pkhr5fpyre2tw3ltrzc0kvxknnsgt04thym9l7n2rmxgw0sgefues
export const InitializeContractBalances = async (
    contractAddr: string,
    blockHeight: bigint
) => {
    let totalBalanceEntity = await TotalBalance.get(contractAddr);

    if (!totalBalanceEntity) {
        logger.info(
            `##----- InitializeContractBalances: ${JSON.stringify(
                contractAddr
            )}`
        );
        const contract = await api.getContract(contractAddr);
        logger.info(`##----- contract: ${JSON.stringify(contract)}`);
        try {
            const contractHistory = await api.getContractCodeHistory(
                contractAddr
            );
            logger.info(
                `##----- contractHistory: ${JSON.stringify(contractHistory)}`
            );

            for (const hist of contractHistory) {
                let initialized: Boolean = false;

                if (hist.operation != "Init" || initialized) {
                    break;
                }

                if ("decimals" in hist.msg && "initial_balances" in hist.msg) {
                    const instantiateMsg =
                        hist.msg as unknown as InstantiateCW20Msg;

                    let totalBalance: bigint = BigInt(0);

                    for (const initialBalance of instantiateMsg.initial_balances) {
                        const amt = BigInt(initialBalance.amount);
                        totalBalance += amt;

                        await RecordNewTransaction(
                            contractAddr,
                            initialBalance.address,
                            blockHeight,
                            "",
                            amt,
                            BigInt(0)
                        );
                    }

                    await AddUpdateTotalBalanceEntity(
                        contractAddr,
                        totalBalance
                    );

                    initialized = true;
                }
            }
        } catch (e) {}
    }
};
