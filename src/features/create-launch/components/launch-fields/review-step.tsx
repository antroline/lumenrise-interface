'use client';

import type { ReactNode } from 'react';
import type { WizardStep } from '../../lib/launch-validation';
import {
  formatAmount,
  bondingStartDate,
  formatSupplyShare,
  launchDurationLabel,
  methodLabels,
  type LaunchDraft,
} from '../../lib/launch-draft';
import { launchPreview, formatLaunchNumber } from '../../lib/calculate-launch';
import { LaunchCalculationPreview } from './launch-calculation-preview';
import { AllocationPreview } from './allocation-preview';
import { QuoteIcon } from './quote-icon';
import { ReviewHeading } from './review-heading';
import { ReviewSection } from './review-section';

export function ReviewStep({
  draft,
  onEdit,
}: {
  draft: LaunchDraft;
  onEdit: (step: WizardStep) => void;
}) {
  const { calculation } = launchPreview(draft);
  const row = (label: string, value: ReactNode): [string, ReactNode] => [
    label,
    value,
  ];
  const months = (value: string) =>
    `${value} ${value === '1' ? 'month' : 'months'}`;
  const schedule =
    draft.method === 'bonding'
      ? draft.bonding
      : draft.method === 'fixed'
        ? draft.fixed
        : draft.auction;
  const formatScheduleTime = (value: string) =>
    value
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(new Date(value))
      : '—';
  const startsAt = draft.method === 'bonding' ? bondingStartDate(draft.bonding) : schedule.startsAt;
  const quote = (
    <span className="inline-flex items-center gap-1.5">
      <QuoteIcon quote={draft.quote} className="size-5" />
      {draft.quote}
    </span>
  );
  return (
    // Two columns on a wide card: identity across the top, launch terms beside the smaller
    // sections, then the allocation across the bottom. A single column follows the DOM order.
    <div className="grid min-w-0 gap-x-10 gap-y-8 short:gap-y-6 @min-[760px]/launch:grid-cols-2">
      <section
        aria-labelledby="review-token-heading"
        className="min-w-0 @min-[760px]/launch:col-span-2"
      >
        <ReviewHeading
          id="review-token-heading"
          title="Token info"
          actions={[
            { label: 'Edit project', onClick: () => onEdit('project') },
            { label: 'Edit token', onClick: () => onEdit('token') },
          ]}
        />
        <div className="grid min-w-0 gap-x-8 gap-y-3 pt-4 @min-[760px]/launch:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-3.5 self-start">
            {draft.logo && (
              <img
                src={draft.logo}
                alt=""
                className="size-14 shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="break-words text-[20px] font-semibold leading-tight">
                {draft.name}
              </p>
              <p className="text-ui text-muted-foreground">{draft.symbol}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="max-w-[68ch] break-words text-ui leading-relaxed">
              {draft.description}
            </p>
            {(draft.website || draft.xAccount) && (
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-small text-muted-foreground">
                {draft.website && (
                  <div className="flex min-w-0 gap-2">
                    <dt>Website</dt>
                    <dd className="min-w-0 break-all text-foreground">
                      {draft.website}
                    </dd>
                  </div>
                )}
                {draft.xAccount && (
                  <div className="flex min-w-0 gap-2">
                    <dt>X</dt>
                    <dd className="min-w-0 break-all text-foreground">
                      {draft.xAccount}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </section>
      <ReviewSection
        title={`${methodLabels[draft.method]} details`}
        className="@min-[760px]/launch:row-start-2"
        actions={[
          { label: 'Edit terms', onClick: () => onEdit(draft.method === 'bonding' ? 'token' : 'sale') },
          { label: 'Edit dates', onClick: () => onEdit('settings') },
        ]}
        rows={[
          row(
            'Start date',
            startsAt
              ? formatScheduleTime(startsAt)
              : 'Immediately',
          ),
          ...(draft.method !== 'bonding'
            ? [
                row(
                  'End date',
                  schedule.endsAt
                    ? formatScheduleTime(schedule.endsAt)
                    : `${launchDurationLabel(schedule.durationDays)} (from start)`,
                ),
              ]
            : []),
          ['Total supply', `${formatAmount(draft.supply)} ${draft.symbol}`],
          ['Raise currency', quote],
          ...(draft.method === 'bonding'
            ? [
                row(
                  'Graduation target',
                  calculation ? `$${formatLaunchNumber(calculation.graduationTarget)} USDC` : '—',
                ),
                row(
                  'Launch cost',
                  'Estimated when the launch contract is connected',
                ),
              ]
            : draft.method === 'fixed'
              ? [
                  row(
                    'For sale',
                    `${formatSupplyShare(draft.supply, draft.allocation.saleShare)} ${draft.symbol} (${draft.allocation.saleShare}%)`,
                  ),
                  row('Price per token', `${draft.fixed.price} ${draft.quote}`),
                ]
              : [
                  row(
                    'For bidders',
                    `${formatSupplyShare(draft.supply, draft.allocation.saleShare)} ${draft.symbol} (${draft.allocation.saleShare}%)`,
                  ),
                  row(
                    'Floor price per token',
                    `${draft.auction.floorPrice} ${draft.quote}`,
                  ),
                  row(
                    'Minimum raise',
                    `${formatAmount(draft.auction.threshold)} ${draft.quote}`,
                  ),
                ]),
        ]}
      />
      <ReviewSection
        title="Supply & allocation"
        className="@min-[760px]/launch:col-span-2 @min-[760px]/launch:row-start-3"
        actions={[
          { label: 'Edit allocation', onClick: () => onEdit('allocation') },
        ]}
        extra={
          <div className="mt-4">
            {draft.method === 'bonding' ? <LaunchCalculationPreview draft={draft} technical /> : <AllocationPreview draft={draft} showVesting />}
            {draft.method === 'bonding' && Number(draft.allocation.teamShare) > 0 && <p className="mt-3 text-small text-muted-foreground">Team vesting: {draft.allocation.cliffMonths} months cliff · {draft.allocation.vestingMonths} months vesting</p>}
          </div>
        }
      />
      <div className="flex min-w-0 flex-col gap-8 short:gap-6 @min-[760px]/launch:col-start-2 @min-[760px]/launch:row-start-2">
        {draft.method === 'bonding' && (
          <ReviewSection
            title="Creator proceeds"
            actions={[
              { label: 'Edit tokenomics', onClick: () => onEdit('token') },
            ]}
            rows={[["Creator Raise", `$${formatAmount(draft.bonding.creatorPayout)} USDC`], ['Creator Tax', `${draft.bonding.creatorFee}%`]]}
          />
        )}
        {draft.method !== 'bonding' && (
          <ReviewSection
            title={draft.method === 'auction' ? 'Pool details' : 'Sale limits'}
            actions={
              draft.method === 'auction'
                ? [
                    { label: 'Edit proceeds', onClick: () => onEdit('sale') },
                    { label: 'Edit lock', onClick: () => onEdit('settings') },
                  ]
                : [{ label: 'Edit settings', onClick: () => onEdit('settings') }]
            }
            rows={
              draft.method === 'fixed'
                ? [
                    [
                      'Wallet cap',
                      draft.fixed.walletCap
                        ? `${draft.fixed.walletCap} ${draft.quote}`
                        : 'None',
                    ],
                  ]
                : [
                    [
                      'Post-auction liquidity',
                      `${draft.auction.liquidityShare}% of proceeds`,
                    ],
                    [
                      'Liquidity lock',
                      draft.auction.timelockDays === '0'
                        ? 'No lock'
                        : `${draft.auction.timelockDays} ${draft.auction.timelockDays === '1' ? 'day' : 'days'}`,
                    ],
                  ]
            }
          />
        )}
        <ReviewSection
          title="Eligibility"
          actions={[
            { label: 'Edit participation', onClick: () => onEdit('eligibility') },
          ]}
          rows={[
            [
              'Participation',
              {
                open: 'Open to everyone',
                allowlist: 'Allowlist',
                reputation: 'Reputation rules',
                custom: 'Other verification',
              }[draft.eligibility.mode],
            ],
            ...(draft.eligibility.mode === 'open'
              ? []
              : [row('Requirements', draft.eligibility.requirements)]),
            row(
              'Identification hook',
              draft.eligibility.identificationMode === 'required'
                ? 'Required'
                : 'None',
            ),
            ...(draft.eligibility.identificationMode === 'required'
              ? [
                  row(
                    'Identity check',
                    draft.eligibility.identificationRequirements,
                  ),
                ]
              : []),
          ]}
        />
        {draft.method !== 'bonding' && (
          <ReviewSection
            title="Participant vesting"
            actions={[
              { label: 'Edit vesting', onClick: () => onEdit('vesting') },
            ]}
            rows={
              draft.participantVesting.mode === 'immediate'
                ? [['Release', 'All tokens at launch']]
                : [
                    ['At launch', `${draft.participantVesting.tgePercent}%`],
                    ['Cliff', months(draft.participantVesting.cliffMonths)],
                    [
                      'Linear release',
                      months(draft.participantVesting.durationMonths),
                    ],
                  ]
            }
          />
        )}
      </div>
    </div>
  );
}
