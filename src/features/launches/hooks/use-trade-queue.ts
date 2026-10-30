'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLaunchpad } from '@/lib/launchpad';
import { getApiChain } from '@/lib/api/client';
import { sameAddress } from '@/lib/chain-address';
import { useNetwork } from '@/lib/networks/context';
import { usePageVisible } from './queries';
import { flushTradeQueue, QUEUE_EVENT, REGISTERED_EVENT, registrationRecorded, readTradeQueue, resumeTradeIdentity, type QueuedTrade, type ConfirmedLaunch } from '../../../lib/api/launches/trade-queue';
import type { ApiNetwork } from '../../../lib/api/launches/types';

export function useTradeQueue(network: ApiNetwork, contractId?: string, slug?: string) {
  const { address, account } = useLaunchpad();
  const client = useQueryClient();
  const visible = usePageVisible();
  const userId =
    account.status === 'registered' ? account.profile.userId : null;
  const [records, setRecords] = useState<ReturnType<typeof readTradeQueue>>([]);
  const [recoveryError, setRecoveryError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const update = () =>
      setRecords(
        readTradeQueue().filter(
          (t) =>
            (t.chain ?? 'stellar') === getApiChain() &&
            t.network === network &&
            (!contractId || sameAddress(t.contractId, contractId)) &&
            (!contractId || sameAddress(t.traderAddress, address)) &&
            t.userId === userId,
        ),
      );
    const drain = async () => {
      update();
      if (running || !visible || !userId || controller.signal.aborted) return;
      running = true;
      try {
        setRecoveryError(false);
        await flushTradeQueue({
          network,
          contractId,
          slug,
          traderAddress: contractId ? address : undefined,
          signal: controller.signal,
          onRecorded: registrationRecorded,
        });
      } catch {
        if (!controller.signal.aborted) setRecoveryError(true);
      } finally {
        running = false;
        if (!controller.signal.aborted) update();
      }
    };
    const timer = visible ? setInterval(() => void drain(), 5000) : undefined;
    const wake = () => void drain();
    const onQueueChange = () => {
      update();
      if (!running) void drain();
    };
    window.addEventListener(QUEUE_EVENT, onQueueChange);
    window.addEventListener('storage', wake);
    window.addEventListener('online', wake);
    void drain();
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener(QUEUE_EVENT, onQueueChange);
      window.removeEventListener('storage', wake);
      window.removeEventListener('online', wake);
    };
  }, [address, userId, network, contractId, slug, client, visible]);
  return { records, recoveryError };
}

/** Mounted throughout the application, including Create and after reload. */
export function useConfirmationRecovery(network: ApiNetwork) {
  const { account, address } = useLaunchpad();
  const userId = account.status === 'registered' ? account.profile.userId : null;
  const client = useQueryClient();
  useTradeQueue(network);
  useEffect(() => {
    if (!userId || !address) return;
    for (const record of readTradeQueue()) {
      if (record.network === network && record.userId === userId)
        resumeTradeIdentity(network, record.contractId, record.traderAddress);
    }
  }, [userId, address, network]);
  useEffect(() => {
    const recorded = (event: Event) => {
      const { record, launches } = (event as CustomEvent<{ record: QueuedTrade; launches?: ConfirmedLaunch[] }>).detail;
      const chain = record.chain ?? 'stellar';
      // Detail prefixes include market, trades, chart and holders. Lists own project volume data.
      for (const slug of new Set([record.slug, ...launches?.map(launch => launch.slug) ?? []])) {
        if (slug) void client.invalidateQueries({ queryKey: ['launch', chain, record.network, slug] });
      }
      void client.invalidateQueries({ queryKey: ['launch-list', { chain, network: record.network }] });
      if (chain === 'base') {
        const chainId = record.network === 'testnet' ? 84532 : 8453;
        void client.invalidateQueries({ queryKey: ['readContract', { chainId }] });
        void client.invalidateQueries({ queryKey: ['balance', { chainId }] });
      }
    };
    window.addEventListener(REGISTERED_EVENT, recorded);
    return () => window.removeEventListener(REGISTERED_EVENT, recorded);
  }, [client]);
}

export function ConfirmationRecovery() {
  const { activeNetwork } = useNetwork();
  useConfirmationRecovery(activeNetwork.apiNetwork);
  return null;
}
