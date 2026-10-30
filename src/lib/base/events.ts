import { decodeEventLog, type Log } from 'viem';
import { launchAbi } from './launchAbi';
import { sameEvmAddress } from './wallet';
import { baseExecutionPrice } from './amount';
/** Decode only the selected launch's actual caller events. Logs from approvals/other curves are excluded. */
export function decodeBaseTradeEvents(logs: Pick<Log, 'address' | 'data' | 'topics'>[], curve: string, caller: string, assetDecimals: number) {
  return logs.flatMap(log => {
    if (!sameEvmAddress(log.address, curve)) return [];
    try {
      const event = decodeEventLog({ abi: launchAbi, data: log.data, topics: log.topics });
      if (event.eventName === 'Bought' && sameEvmAddress(event.args.buyer, caller)) {
        const { payment, creator_fee: fee, received: amount } = event.args;
        if (payment < fee) return [];
        const gross = payment - fee;
        return [{ side: 'buy' as 'buy' | 'sell', amount, gross, fee, userAmount: payment, executionPrice: baseExecutionPrice(gross, amount, assetDecimals) }];
      }
      if (event.eventName === 'Sold' && sameEvmAddress(event.args.seller, caller)) {
        const { received, creator_fee: fee, amount } = event.args;
        const gross = received + fee;
        return [{ side: 'sell' as 'buy' | 'sell', amount, gross, fee, userAmount: received, executionPrice: baseExecutionPrice(gross, amount, assetDecimals) }];
      }
    } catch { /* Non-trade events do not verify execution. */ }
    return [];
  });
}
