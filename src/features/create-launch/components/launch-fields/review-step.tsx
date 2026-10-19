'use client';

import type { ReactNode } from 'react';
import type { WizardStep } from '../../lib/launch-validation';
import {
  formatAmount,
  formatSupplyShare,
  launchDurationLabel,
  methodLabels,
  type LaunchDraft,
} from '../../lib/launch-draft';
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
  const quote = (
    <span className="inline-flex items-center gap-1.5">
      <QuoteIcon quote={draft.quote} className="size-5" />
      {draft.quote}
    </span>
  );
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[700px] flex-col gap-8 short:gap-5">
      <section aria-labelledby="review-token-heading">
        <ReviewHeading
          id="review-token-heading"
          title="Token info"
          actions={[
            { label: 'Edit project', onClick: () => onEdit('project') },
            { label: 'Edit token', onClick: () => onEdit('token') },
          ]}
        />
        <div className="flex items-center gap-4 py-4">
          {draft.logo && (
            <img
              src={draft.logo}
              alt=""
              className="size-14 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="break-words text-[20px] font-semibold">
              {draft.name}
            </p>
            <p className="text-ui text-muted-foreground">{draft.symbol}</p>
          </div>
        </div>
        <p className="break-words text-ui leading-relaxed">
          {draft.description}
        </p>
        {(draft.website || draft.xAccount) && (
          <dl className="mt-3 grid gap-1 text-small text-muted-foreground">
            {draft.website && (
              <div className="flex gap-2">
                <dt>Website</dt>
                <dd className="min-w-0 break-all text-foreground">
                  {draft.website}
                </dd>
              </div>
            )}
            {draft.xAccount && (
              <div className="flex gap-2">
                <dt>X</dt>
                <dd className="min-w-0 break-all text-foreground">
                  {draft.xAccount}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>
      <ReviewSection
        title={`${methodLabels[draft.method]} details`}
        actions={[
          { label: 'Edit terms', onClick: () => onEdit('sale') },
          { label: 'Edit dates', onClick: () => onEdit('settings') },
        ]}
        rows={[
          row(
            'Start date',
            schedule.startsAt
              ? formatScheduleTime(schedule.startsAt)
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
                  `${formatAmount(draft.bonding.target)} ${draft.quote}`,
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
        actions={[
          { label: 'Edit allocation', onClick: () => onEdit('allocation') },
        ]}
        extra={
          <div className="mt-2">
            <AllocationPreview draft={draft} showVesting />
          </div>
        }
      />
      {draft.method === 'bonding' && (
        <ReviewSection
          title="Creator fees"
          actions={[
            { label: 'Edit settings', onClick: () => onEdit('settings') },
          ]}
          rows={[['Creator fee share', `${draft.bonding.creatorFee}%`]]}
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
        actions={[]}
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
  );
}
