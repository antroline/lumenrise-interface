import { cn } from '@/lib/utils';
import { TradeTooltipText } from '../trading/trade-tooltip';

export type TokenAllocation = {
  name: string;
  /** Share of total supply in basis points, from the actual token buckets. */
  bps: number;
  share: string;
  tokens: string;
  tokensTitle: string;
  detail: string;
};

export type VestingPlan =
  | { kind: 'none' | 'immediate'; summary: string }
  | {
      kind: 'schedule';
      summary: string;
      /** Cliff length as a share of the full cliff-plus-vesting span, 0–1. */
      cliffShare: number;
      start: string;
      cliffEnd: string;
      end: string;
      elapsedShare: number;
    };

const hatch =
  'bg-[repeating-linear-gradient(135deg,var(--muted-foreground)_0_1.5px,transparent_1.5px_4px)] ring-1 ring-inset ring-muted-foreground/60';
const swatches = ['bg-foreground', 'bg-chart-5', hatch];

/** Whole units out of 100 that preserve the total, using largest remainders. */
function units(allocations: TokenAllocation[]) {
  const total = allocations.reduce((sum, item) => sum + item.bps, 0);
  if (total <= 0) return allocations.map(() => 0);
  const exact = allocations.map((item) => (item.bps / total) * 100);
  const counts = exact.map(Math.floor);
  const order = exact
    .map((value, index) => [value - Math.floor(value), index] as const)
    .sort((a, b) => b[0] - a[0]);
  for (
    let left = 100 - counts.reduce((sum, value) => sum + value, 0), i = 0;
    left > 0;
    left--, i++
  )
    counts[order[i % order.length][1]]++;
  return counts;
}

function UnitGrid({ allocations }: { allocations: TokenAllocation[] }) {
  const cells = units(allocations).flatMap((count, index) =>
    Array.from({ length: count }, () => index),
  );
  return (
    <div
      aria-hidden="true"
      className="grid w-full max-w-[232px] grid-cols-10 gap-[3px]"
    >
      {cells.map((tone, index) => (
        <span
          key={index}
          className={cn(
            'aspect-square rounded-[3px]',
            swatches[tone % swatches.length],
          )}
        />
      ))}
    </div>
  );
}

function VestingTimeline({
  plan,
}: {
  plan: Extract<VestingPlan, { kind: 'schedule' }>;
}) {
  const elapsed = Math.max(0, Math.min(plan.elapsedShare, 1));
  const showNow = elapsed > 0 && elapsed < 1;
  return (
    <div
      className="mt-4 rounded-xl bg-surface/80 p-4 sm:p-5"
      role="img"
      aria-label={`Team vesting starts ${plan.start}${plan.cliffShare > 0 ? `, cliff ends ${plan.cliffEnd}` : ''}, fully vested ${plan.end}.`}
    >
      <div className="relative pt-9" aria-hidden="true">
        {showNow && (
          <span
            className="absolute top-0 -translate-x-1/2 rounded-md bg-chart-5/15 px-2 py-1 text-[11px] leading-4 font-semibold text-foreground"
            style={{
              left: `clamp(24px, ${elapsed * 100}%, calc(100% - 24px))`,
            }}
          >
            Today
          </span>
        )}
        <div className="relative flex h-3 gap-1">
          {plan.cliffShare > 0 && (
            <span
              className={cn('rounded-full', hatch)}
              style={{ flexGrow: plan.cliffShare, flexBasis: 0 }}
            />
          )}
          <span
            className="relative overflow-hidden rounded-full bg-foreground/65"
            style={{ flexGrow: 1 - plan.cliffShare, flexBasis: 0 }}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-lime"
              style={{
                width: `${plan.cliffShare < 1 ? Math.max(0, Math.min((elapsed - plan.cliffShare) / (1 - plan.cliffShare), 1)) * 100 : 0}%`,
              }}
            />
          </span>
          {showNow && (
            <span
              className="absolute -top-1.5 -bottom-1.5 z-10 w-[3px] -translate-x-1/2 rounded-full bg-chart-5"
              style={{ left: `${elapsed * 100}%` }}
            />
          )}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'mt-4 grid gap-3 text-xs leading-5 text-muted-foreground tabular-nums',
          plan.cliffShare > 0 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        <span>
          <span className="block font-medium text-foreground">Start</span>
          {plan.start}
        </span>
        {plan.cliffShare > 0 ? (
          <span className="text-center">
            <span className="block font-medium text-foreground">
              Cliff ends
            </span>
            {plan.cliffEnd}
          </span>
        ) : null}
        <span className="text-right">
          <span className="block font-medium text-foreground">
            Fully vested
          </span>
          {plan.end}
        </span>
      </div>
    </div>
  );
}

export function LaunchTokenomics({
  allocations,
  vesting,
}: {
  allocations: TokenAllocation[];
  vesting: VestingPlan;
}) {
  return (
    <div>
      <div className="grid items-start gap-7 sm:grid-cols-[minmax(0,232px)_minmax(0,1fr)] sm:gap-10">
        <UnitGrid allocations={allocations} />
        <ul aria-label="Token allocations" className="divide-y divide-divider">
          {allocations.map((allocation, index) => (
            <li
              key={allocation.name}
              className="flex min-w-0 items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <h3 className="flex items-center gap-2.5 text-[15px] font-medium">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-3 shrink-0 rounded-[3px]',
                      swatches[index % swatches.length],
                    )}
                  />
                  {allocation.name}
                </h3>
                <p className="mt-1 pl-[22px] text-[13px] leading-relaxed text-muted-foreground">
                  {allocation.detail}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[18px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">
                  {allocation.share}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">
                  <TradeTooltipText content={allocation.tokensTitle}>
                    {allocation.tokens}
                  </TradeTooltipText>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 border-t border-divider pt-6">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
          <TradeTooltipText content="The configured schedule for the creator's team allocation to become claimable. Time elapsed does not mean tokens have already been claimed.">
            Team vesting
          </TradeTooltipText>
        </h3>
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">
          {vesting.summary}
        </p>
        {vesting.kind === 'schedule' && <VestingTimeline plan={vesting} />}
      </div>
    </div>
  );
}
