'use client';

import { ProjectMark } from '@/components/project-mark';
import { Badge } from '@/components/ui/badge';
import { getTradingToken } from '@/lib/data';
import { getLaunchContent } from '../data/launch-content';
import { LaunchActionCard } from './launch-action-card';
import { LaunchExtraSections } from './launch-extra-sections';
import { LaunchSection } from './launch-panel';
import { PriceChart } from '../trading/price-chart';
import { SwapPanel } from '../trading/swap-panel';
import { TradeActivity } from '../trading/trade-activity';
import { PoolTable } from '../trading/pool-table';
import { TradeMotion } from '../trading/trade-motion';

/** Existing illustrative spot markets share the project destination, without invented curve data. */
export function PreviewTradingLaunch({ slug }: { slug: string }) {
  const token = getTradingToken(slug);
  if (!token) return null;
  const content = getLaunchContent(slug);
  return (
    <TradeMotion>
      <div className="mx-auto grid w-full min-w-0 max-w-[1320px] items-start gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <LaunchActionCard
            name={token.name}
            loading={false}
            identity={
              <header className="flex flex-col gap-4 border-b border-divider p-5">
                <div className="flex items-center gap-3">
                  <ProjectMark name={token.name} size={56} />
                  <div className="min-w-0">
                    <h1 className="break-words text-2xl font-semibold">
                      {token.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      ${token.ticker}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="soft">Illustrative preview</Badge>
                  <Badge variant="net">Testnet</Badge>
                </div>
                <div className="flex flex-wrap gap-4">
                  {content.links?.map((link) => (
                    <a
                      key={link.kind}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline underline-offset-4"
                    >
                      {link.kind === 'x' ? 'X' : link.kind}
                    </a>
                  ))}
                </div>
              </header>
            }
            trade={
              <SwapPanel
                slug={slug}
                name={token.name}
                ticker={token.ticker}
                priceUsd={Number(token.price.replace('$', ''))}
              />
            }
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <PriceChart ticker={token.ticker} price={token.price} />
          <LaunchExtraSections content={content} />
          <LaunchSection id="market-stats" title="Market stats">
            <p className="text-sm text-muted-foreground">
              Price {token.price} · Illustrative preview. Live volume, liquidity
              and holders are not connected.
            </p>
          </LaunchSection>
          <TradeActivity
            trades={
              <p className="py-6 text-sm text-muted-foreground">
                This preview has no connected trade history.
              </p>
            }
            pools={<PoolTable name={token.name} ticker={token.ticker} />}
          />
        </div>
      </div>
    </TradeMotion>
  );
}
