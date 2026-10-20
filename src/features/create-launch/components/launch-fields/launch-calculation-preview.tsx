import {
  formatLaunchNumber,
  formatLaunchPrice,
  launchPreview,
} from '../../lib/calculate-launch';
import type { LaunchDraft } from '../../lib/launch-draft';
import { AllocationPreview } from './allocation-preview';

export function LaunchCalculationPreview({
  draft,
  technical = false,
}: {
  draft: LaunchDraft;
  technical?: boolean;
}) {
  const { calculation: c, error } = launchPreview(draft);
  if (!c)
    return (
      <p role="status" className="text-small text-muted-foreground">
        {error}
      </p>
    );
  const rows = [
    ['Graduation target', `$${formatLaunchNumber(c.graduationTarget)}`],
    ['Start price', `$${formatLaunchPrice(c.startPrice)}`],
    ['Graduation price', `$${formatLaunchPrice(c.graduationPrice)}`],
    ['Price growth', `${c.actualPriceMultiplier.toFixed(3)}×`],
  ];
  return (
    <section
      aria-label="Calculated launch preview"
      className="@container/calc min-w-0"
    >
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 @min-[36rem]/calc:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-small text-muted-foreground">{label}</dt>
            <dd className="break-words text-ui font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <AllocationPreview draft={draft} />
      <p className="mt-3 text-small text-muted-foreground">
        Calculated automatically. Prices are estimates in USDC; growth targets
        10× and varies slightly with allocation rounding.
      </p>
      {technical && (
        <details className="mt-4 text-small">
          <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Technical details & estimates
          </summary>
          <dl className="mt-3 grid gap-x-10 gap-y-2 @min-[44rem]/calc:grid-cols-2">
            {[
              ['Creator payout share', `${c.creatorPayoutBps / 100}%`],
              [
                'Platform fee',
                `1% · $${formatLaunchNumber(c.platformRevenue)}`,
              ],
              ['Pool liquidity', `$${formatLaunchNumber(c.poolQuote)}`],
              ['Pool price', `$${formatLaunchPrice(c.poolPrice)}`],
              [
                'Virtual base reserve (contract units)',
                c.contract.virtual_base_reserve,
              ],
              [
                'Virtual quote reserve (contract units)',
                c.contract.virtual_quote_reserve,
              ],
              [
                'Graduation target (contract units)',
                c.contract.graduation_target,
              ],
              [
                'Creator tax estimate · buys only',
                `$${formatLaunchNumber(c.buyOnlyCreatorTaxEstimate)}`,
              ],
              [
                'Buyer spend estimate · buys only',
                `$${formatLaunchNumber(c.buyOnlyBuyerSpendEstimate)}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-all tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-muted-foreground">
            Contract amounts use 7 decimal places and integer rounding. Tax
            estimates assume buys only; trading tax is separate from the
            graduation payout.
          </p>
        </details>
      )}
    </section>
  );
}
