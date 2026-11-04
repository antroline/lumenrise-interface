'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl, getApiChain, getApiNetwork, getApiUserId } from '@/lib/api/client';
import { QUEUE_EVENT, readLaunchConfirmation } from '@/lib/api/launches/trade-queue';
import type { LaunchOperation } from '../lib/launch-operation';

/** Continue observing API completion after the foreground wait has ended. */
export function useLaunchOperation(onCompleted?: (operation: LaunchOperation) => void) {
  const [operation, setOperation] = useState<LaunchOperation | null>(null);
  const router = useRouter();
  useEffect(() => {
    const record = operation?.registration;
    if (operation?.status !== 'pending' || !record) return;
    let completed = false;
    const update = () => {
      if (completed) return;
      if (getApiChain() !== record.chain || getApiNetwork() !== record.network ||
          getApiUserId() !== record.userId || getApiBaseUrl() !== record.apiBaseUrl) return;
      const result = readLaunchConfirmation(record);
      if (!result || (record.chain === 'base'
        ? result.contractId.toLowerCase() !== record.contractId.toLowerCase()
        : result.contractId !== record.contractId)) return;
      completed = true;
      onCompleted?.(operation);
      setOperation(current => current?.registration === record && current.status === 'pending'
        ? { ...current, status: 'success', slug: result.slug, curveAddress: result.contractId,
          message: 'Your launch is confirmed and the project page is ready.' }
        : current);
      router.refresh();
    };
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener('storage', update);
    update();
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, [operation, router, onCompleted]);
  return [operation, setOperation] as const;
}
