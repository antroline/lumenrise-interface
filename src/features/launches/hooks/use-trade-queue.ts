'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLaunchpad } from '@/lib/launchpad';
import { launchKey, usePageVisible } from './queries';
import { flushTradeQueue, QUEUE_EVENT, readTradeQueue } from '../../../lib/api/launches/trade-queue';
import type { ApiNetwork } from '../../../lib/api/launches/types';

export function useTradeQueue(network: ApiNetwork, contractId: string, slug?: string) {
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
            t.network === network &&
            t.contractId === contractId &&
            t.traderAddress === address &&
            (t.userId === null || t.userId === userId),
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
          traderAddress: address,
          signal: controller.signal,
          onRecorded: () => {
            void client.invalidateQueries({
              queryKey: launchKey(network, slug ?? ''),
            });
            void client.invalidateQueries({
              queryKey: ['launch-list', { network }],
            });
          },
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
