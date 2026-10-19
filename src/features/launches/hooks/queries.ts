'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api/client';
import {
  getLaunchDetail,
  getLaunchList,
  launchListKey,
  getMarket,
} from '../../../lib/api/launches/market';
import type { ApiNetwork } from '../../../lib/api/launches/types';

export const launchKey = (network: ApiNetwork, contractId: string) =>
  ['launch', network, contractId] as const;
export const publicQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  retry: (count: number, error: Error) =>
    count < 2 &&
    (!(error instanceof ApiError) || !error.status || error.status >= 500),
};

/** Disables page polling and cancels active HTTP reads when the tab is hidden. */
export function usePageVisible() {
  const [visible, setVisible] = useState(
    () =>
      typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

export function useLaunchDetail(id: string, network: ApiNetwork) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, id), 'detail'],
    queryFn: ({ signal }) => getLaunchDetail(id, network, signal),
    enabled: visible,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, id), 'detail'],
      });
  }, [client, id, network, visible]);
  return query;
}

/** First page of a creator's launches; shares its cache key with the owner-filtered projects list. */
export function useCreatorLaunches(owner: string | undefined, network: ApiNetwork) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const queryKey = launchListKey(network, 1, 20, owner);
  const query = useQuery({
    ...publicQueryOptions,
    queryKey,
    queryFn: ({ signal }) => getLaunchList(network, 1, 20, owner, signal),
    enabled: visible && !!owner,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: launchListKey(network, 1, 20, owner),
      });
  }, [client, network, owner, visible]);
  return query;
}

export function useMarket(id: string, network: ApiNetwork) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, id), 'market'],
    queryFn: ({ signal }) => getMarket(id, network, signal),
    enabled: visible,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, id), 'market'],
      });
  }, [client, id, network, visible]);
  return query;
}
