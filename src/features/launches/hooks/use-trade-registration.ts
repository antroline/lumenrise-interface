'use client';

import { useEffect, useState } from 'react';
import { isTradeRecorded, QUEUE_EVENT, readTradeQueue, tradeQueueKey, type RegistrationIdentity } from '@/lib/api/launches/trade-queue';

export type TradeRegistrationStatus = 'pending' | 'completed' | 'attention';

export function useTradeRegistration(record?: RegistrationIdentity): TradeRegistrationStatus {
  const key = record ? tradeQueueKey(record) : undefined;
  const [snapshot, setSnapshot] = useState<{ key: string; status: TradeRegistrationStatus }>();
  useEffect(() => {
    if (!record || !key) return;
    const update = () => {
      const queued = readTradeQueue().find(item => tradeQueueKey(item) === key);
      const status = isTradeRecorded(record) ? 'completed'
        : queued && queued.state !== 'pending' ? 'attention' : 'pending';
      setSnapshot({ key, status });
    };
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener('storage', update);
    update();
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, [key, record]);
  return snapshot?.key === key ? snapshot?.status ?? 'pending' : 'pending';
}
