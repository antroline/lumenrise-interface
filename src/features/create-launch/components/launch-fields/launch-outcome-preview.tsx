'use client';

import { cn } from '@/lib/utils';
import {
  formatLaunchNumber,
  formatLaunchPrice,
  formatLaunchUnits,
  launchPreview,
} from '../../lib/calculate-launch';
import { allocationLabels, type LaunchDraft } from '../../lib/launch-draft';

/** The calculated launch preview, laid out as a side panel that updates as the creator types. */
export function LaunchOutcomePreview({ draft }: { draft: LaunchDraft }) {
  const { calculation: c, error } = launchPreview(draft);
  const symbol = draft.symbol.trim() || 'tokens';
  const prices = [
    ['Start price', c ? `$${formatLaunchPrice(c.startPrice)}` : '—'],
    ['Graduation price', c ? `$${formatLaunchPrice(c.graduationPrice)}` : '—'],
    ['Price growth', c ? `${c.actualPriceMultiplier.toFixed(3)}×` : '—'],
  ];
  const shares = [
    { key: 'curve', label: allocationLabels[draft.method], bps: c?.allocations.curve_bps, units: c?.tokenUnits.curve, swatch: 'bg-foreground' },
    { key: 'pool', label: 'Pool', bps: c?.allocations.pool_bps, units: c?.tokenUnits.pool, swatch: 'bg-lime' },
    { key: 'team', label: 'Team', bps: c?.allocations.team_bps, units: c?.tokenUnits.team, swatch: 'bg-orange' },
  ];

  return (
    <section
      aria-labelledby="launch-preview-title"
      className="@container/preview min-w-0 rounded-xl bg-secondary/60 p-4"
    >
      <h3 id="launch-preview-title" className="text-small font-medium text-muted-foreground">
        Calculated launch preview
      </h3>

      {/* Side by side when the preview spans the card, stacked in the side column. */}
      <div className="grid gap-x-8 @min-[34rem]/preview:grid-cols-2">
        <div className="min-w-0">
          <p className="mt-3 text-small text-muted-foreground">Graduation target</p>
          <p className="mt-1 break-words text-[26px] leading-tight font-semibold tabular-nums">
            {c ? `$${formatLaunchNumber(c.graduationTarget)}` : '—'}
          </p>
          {error && <p role="status" className="mt-2 text-small text-bad">{error}</p>}

          <dl className="mt-3 flex flex-col gap-2 border-t border-divider pt-3 text-ui">
            {prices.map(([label, value]) => (
              <div key={label} className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-all text-right font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 min-w-0 border-t border-divider pt-4 @min-[34rem]/preview:self-end">
          <h4 className="mb-3 text-small font-medium text-muted-foreground">Token distribution</h4>
          <div
            role="img"
            aria-label={c ? shares.map((share) => `${share.label} ${(share.bps ?? 0) / 100}%`).join(', ') : 'Allocation unavailable'}
            className="flex h-2.5 overflow-hidden rounded-full bg-border"
          >
            {shares.map((share) => (
              <span
                key={share.key}
                className={cn('h-full shrink-0 transition-[width] duration-500 ease-out motion-reduce:transition-none', share.swatch)}
                style={{ width: `${(share.bps ?? 0) / 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-3.5 flex flex-col gap-2.5">
            {shares.map((share) => (
              <li key={share.key} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2.5 text-ui">
                <span aria-hidden="true" className={cn('size-2.5 translate-y-px rounded-full ring-1 ring-inset ring-foreground/20', share.swatch)} />
                <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-muted-foreground">
                    {share.label} · <span className="tabular-nums">{share.bps === undefined ? '—' : `${share.bps / 100}%`}</span>
                  </span>
                  <span className="min-w-0 break-all text-right font-semibold tabular-nums">
                    {share.units ? `${formatLaunchUnits(share.units)} ${symbol}` : '—'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 border-t border-divider pt-3 text-small text-muted-foreground">
        Calculated automatically. Prices are estimates in USDC; growth targets 10× and varies slightly with allocation rounding.
      </p>
    </section>
  );
}
