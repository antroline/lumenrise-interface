'use client';

import { getConfiguration } from '../../../lib/api/config';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appendHolders,
  getHolders,
  type Holder,
  type HoldersResult,
} from '../../../lib/api/launches/holders';
import { launchKey, publicQueryOptions, usePageVisible } from './queries';
import type { ApiNetwork } from '../../../lib/api/launches/types';

export function useHolders(
  slug: string,
  network: ApiNetwork,
  active: boolean,
) {
  const limit = getConfiguration().rules.holders.defaultLimit;
  const client = useQueryClient();
  const visible = usePageVisible();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, slug), 'holders', limit],
    queryFn: ({ signal }) =>
      getHolders(slug, network, { limit }, signal),
    enabled: visible && !!slug,
    refetchInterval: active && visible ? 60_000 : false,
    // A new first-page snapshot must replace appended pages even if values match.
    structuralSharing: false,
  });
  const [extra, setExtra] = useState<{
    slug: string;
    network: ApiNetwork;
    first: HoldersResult;
    items: Holder[];
    cursor: string | null;
  }>();
  if (extra && (extra.slug !== slug || extra.network !== network)) {
    setExtra(undefined);
  }
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{
    slug: string;
    network: ApiNetwork;
    first: HoldersResult;
    error: Error;
  }>();
  if (
    failure &&
    (failure.slug !== slug || failure.network !== network)
  ) {
    setFailure(undefined);
  }
  const running = useRef(false);
  const current = useRef(query.data);
  useEffect(() => {
    current.current = query.data;
  }, [query.data, slug, network]);
  const appended =
    extra?.first === query.data &&
    extra?.slug === slug &&
    extra?.network === network
      ? extra
      : undefined;
  const items = appended?.items ?? query.data?.items ?? [];
  const cursor = appended ? appended.cursor : query.data?.nextCursor;

  useEffect(() => {
    const key = [...launchKey(network, slug), 'holders', 20, 'page'];
    return () => {
      current.current = undefined;
      void client.cancelQueries({ queryKey: key });
    };
  }, [client, slug, network]);
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, slug), 'holders'],
      });
  }, [client, slug, network, visible]);

  async function loadMore() {
    const first = query.data;
    if (!first || cursor == null || running.current || query.isFetching) return;
    running.current = true;
    setPending(true);
    setFailure(undefined);
    try {
      const page = await client.fetchQuery({
        ...publicQueryOptions,
        staleTime: 0,
        queryKey: [
          ...launchKey(network, slug),
          'holders',
          20,
          'page',
          cursor,
        ],
        queryFn: ({ signal }) =>
          getHolders(slug, network, { limit, cursor }, signal),
      });
      if (current.current === first)
        setExtra({
          slug,
          network,
          first,
          items: appendHolders(items, page.items),
          cursor: page.nextCursor,
        });
    } catch (error) {
      if (current.current === first)
        setFailure({
          slug,
          network,
          first,
          error:
            error instanceof Error
              ? error
              : new Error('Could not load holders.'),
        });
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return {
    query,
    items,
    cursor,
    loadMore,
    pending,
    pageError:
      failure?.first === query.data &&
      failure?.slug === slug &&
      failure?.network === network
        ? failure?.error
        : undefined,
  };
}
