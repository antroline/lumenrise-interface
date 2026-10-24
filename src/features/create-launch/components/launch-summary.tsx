'use client';

import { Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  formatAmount,
  isLaunchScheduled,
  methodLabels,
  numberValue,
  validSupply,
  type LaunchDraft,
} from '../lib/launch-draft';
import {
  launchSummaryRows,
  type LaunchSummaryRow,
} from '../lib/launch-summary';
import {
  launchStages,
  type LaunchStage,
} from '../lib/launch-stages';
import { launchTransition, useLaunchReducedMotion } from '../lib/launch-motion';
import { LaunchReveal } from './launch-motion';
import { QuoteIcon } from './launch-fields/quote-icon';
import { launchPreview } from '../lib/calculate-launch';

export type LaunchSummaryProps = {
  draft: LaunchDraft;
  steps: readonly LaunchStage[];
  currentIndex: number;
  reachedIndex: number;
  locked: boolean;
  onNavigate: (index: number) => void;
};

type ChecklistItem = { label: string; value?: string };

const summaryTerms: Record<string, { label: string; help: string }> = {
  'Bonding curve': { label: 'Curve', help: '% of total supply allocated to the bonding curve.' },
  'Creator Tax': { label: 'Creator Tax', help: '% charged on each buy and sell, paid to the creator.' },
  'Creator Raise': { label: 'Creator Raise', help: 'Amount the creator receives upon graduation.' },
  'Liquidity pool': { label: 'Pool', help: '% of total supply added to the liquidity pool at graduation.' },
  Team: { label: 'Team', help: '% of total supply allocated to the team.' },
  'Team cliff': { label: 'Cliff', help: 'Date until which team tokens remain locked.' },
  'Team vesting': { label: 'Vesting', help: 'Number of months over which team tokens unlock monthly.' },
  'Start mode': { label: 'Starts', help: 'When the bonding curve goes live.' },
  'Start date': { label: 'Start date', help: 'When the bonding curve goes live.' },
};

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const tokenIndex = launchStages.findIndex((stage) => stage.id === 'token');
const projectIndex = launchStages.findIndex((stage) => stage.id === 'project');
const editClassName =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none';

function rowValue(rows: LaunchSummaryRow[], label: string) {
  return rows.find((row) => row.label === label)?.value;
}

function stageChecklist(
  draft: LaunchDraft,
  stage: LaunchStage,
): ChecklistItem[] {
  switch (stage.id) {
    case 'token': {
      const rows = launchSummaryRows(draft, 'token');
      return [
        {
          label: 'Method',
          value: draft.methodSelected ? methodLabels[draft.method] : undefined,
        },
        { label: 'Payment asset', value: draft.quote },
        {
          label: 'Supply',
          value: validSupply(draft.supply)
            ? `${compactNumber.format(Number(draft.supply))} ${draft.symbol.trim()}`.trim()
            : undefined,
        },
        { label: 'Bonding curve', value: rowValue(rows, 'Bonding curve') },
        { label: 'Creator Raise', value: rowValue(rows, 'Creator Raise') },
        { label: 'Liquidity pool', value: rowValue(rows, 'Liquidity pool') },
        { label: 'Graduation target', value: rowValue(rows, 'Graduation target') },
        ...(numberValue(draft.allocation.teamShare) > 0
          ? [{ label: 'Team vesting', value: rowValue(rows, 'Team vesting') }]
          : []),
        { label: 'Team', value: rowValue(rows, 'Team') },
        ...(numberValue(draft.allocation.teamShare) > 0
          ? [
              {
                label: 'Team cliff',
                value: /^\d+$/.test(draft.allocation.cliffMonths)
                  ? numberValue(draft.allocation.cliffMonths) === 0
                    ? 'No cliff'
                    : `${formatAmount(draft.allocation.cliffMonths)} mo`
                  : undefined,
              },
            ]
          : []),
        { label: 'Creator Tax', value: rowValue(rows, 'Creator Tax') },
        {
          label: 'Start mode',
          value: isLaunchScheduled(draft.bonding) ? 'Scheduled' : 'Immediately',
        },
        ...(isLaunchScheduled(draft.bonding)
          ? [{ label: 'Start date', value: rowValue(launchSummaryRows(draft, 'settings'), 'Starts') }]
          : []),
      ];
    }
    case 'project':
    case 'eligibility':
    case 'review':
      return [];
  }
}

function summaryChips(draft: LaunchDraft, reachedIndex: number) {
  const tokenReached = reachedIndex >= tokenIndex;
  return [
    ...(tokenReached && draft.methodSelected
      ? [{ key: 'method', label: methodLabels[draft.method] }]
      : []),
    ...(tokenReached ? [{ key: 'quote', label: draft.quote, quote: true }] : []),
    ...(tokenReached && numberValue(draft.allocation.teamShare) > 0
      ? [{ key: 'team', label: `Team ${draft.allocation.teamShare}%` }]
      : []),
  ];
}

function SummaryFigure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <>
      <dt className="truncate text-meta text-muted-foreground" title={label}>{label}</dt>
      <dd className="mt-0.5 truncate text-mid font-semibold tabular-nums">
        {value}
        <span className="text-small font-medium tracking-normal text-muted-foreground">
          {' '}
          {unit}
        </span>
      </dd>
    </>
  );
}

/** Token identity and launch overview. */
function LaunchSummaryHeader({
  draft,
  reachedIndex,
  onEdit,
  locked = false,
}: {
  draft: LaunchDraft;
  reachedIndex: number;
  onEdit?: () => void;
  locked?: boolean;
}) {
  const reduced = useLaunchReducedMotion();
  const name = draft.name.trim();
  const symbol = draft.symbol.trim();
  const chips = summaryChips(draft, reachedIndex);
  const transition = reduced ? { duration: 0 } : launchTransition;
  const supply =
    reachedIndex >= tokenIndex && validSupply(draft.supply)
      ? compactNumber.format(Number(draft.supply))
      : null;
  const { calculation } = launchPreview(draft);
  const target =
    reachedIndex >= tokenIndex && calculation
      ? compactNumber.format(calculation.graduationTarget)
      : null;
  const reveal = {
    initial: { opacity: 0, y: reduced ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : -4 },
    transition,
  };

  if (!draft.logo && !name && !symbol && !chips.length && !supply && !target)
    return (
      <div className="relative -mx-2 -mt-2 min-h-24 shrink-0 rounded-xl bg-secondary p-3">
        <p className="text-title font-semibold">Your project</p>
        <p className="mt-1 text-small leading-relaxed text-muted-foreground">
          Add your project name, symbol and logo to preview your launch.
        </p>
      </div>
    );

  return (
    <motion.div
      layout={!reduced}
      transition={transition}
      className="relative -mx-2 -mt-2 min-h-24 shrink-0 rounded-xl bg-secondary p-3"
    >
      <LaunchReveal show={!!(draft.logo || name || symbol)}>
        <div
          className={cn(
            'relative flex min-h-12 items-center gap-3',
            onEdit && 'pr-10',
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {draft.logo && (
              <motion.span
                key="logo"
                layout={!reduced}
                {...reveal}
                className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card"
              >
                <img
                  src={draft.logo}
                  alt=""
                  className="size-full object-cover"
                />
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div
            layout={!reduced}
            transition={transition}
            className="min-w-0 flex-1"
          >
            <AnimatePresence initial={false}>
              {name && (
                <motion.p
                  key="name"
                  {...reveal}
                  className="truncate text-title font-semibold"
                >
                  {name}
                </motion.p>
              )}
              {symbol && (
                <motion.p
                  key="symbol"
                  {...reveal}
                  className="mt-0.5 truncate text-small tabular-nums text-muted-foreground"
                >
                  ${symbol}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        {onEdit && (
          <button
            type="button"
            disabled={locked}
            onClick={onEdit}
            aria-label="Edit project details"
            title="Edit project details"
            className="absolute right-1.5 top-1.5 grid size-11 [@media(hover:hover)]:size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </LaunchReveal>

      <LaunchReveal show={chips.length > 0}>
        <ul className="relative mt-3 flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {chips.map((chip) => (
              <motion.li
                key={chip.key}
                layout={!reduced}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
                transition={transition}
                className="inline-flex h-6 items-center gap-1 rounded-full bg-card px-2.5 text-meta font-medium text-foreground"
              >
                {'quote' in chip && (
                  <QuoteIcon quote={draft.quote} className="size-3.5" />
                )}
                {chip.label}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LaunchReveal>

      <LaunchReveal show={!!(supply || target)}>
        <dl className="relative mt-3 grid grid-cols-2 gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {supply && (
              <motion.div
                key="supply"
                layout={!reduced}
                {...reveal}
                className="min-w-0"
              >
                <SummaryFigure
                  label="Supply"
                  value={supply}
                  unit={symbol || 'tokens'}
                />
              </motion.div>
            )}
            {target && (
              <motion.div
                key="target"
                layout={!reduced}
                {...reveal}
                className="min-w-0"
              >
                <SummaryFigure
                  label="Target"
                  value={target}
                  unit={`/ ${draft.quote}`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </dl>
      </LaunchReveal>
    </motion.div>
  );
}

export function LaunchSummary({
  draft,
  reachedIndex,
  locked,
  onNavigate,
}: LaunchSummaryProps) {
  const items = reachedIndex >= tokenIndex
    ? stageChecklist(draft, launchStages[tokenIndex]).filter(
        (item) => item.value && !['Method', 'Payment asset', 'Supply', 'Graduation target'].includes(item.label),
      )
    : [];

  return (
    <aside
      aria-label="Your launch summary"
      className="order-last hidden max-h-full min-h-0 min-w-0 flex-col gap-3 self-start rounded-2xl border border-border bg-card p-4 lg:flex"
    >
      <LaunchSummaryHeader
        draft={draft}
        reachedIndex={reachedIndex}
        onEdit={() => onNavigate(projectIndex)}
        locked={locked}
      />
      <section
        aria-labelledby="launch-overview-title"
        className="-mx-2 -mb-2 min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-xl bg-secondary p-3 [scrollbar-width:thin]"
      >
        <div className="flex min-h-11 items-center justify-between gap-2">
          <h2 id="launch-overview-title" className="min-w-0 truncate text-title font-semibold">
            Launch overview
          </h2>
          {reachedIndex >= tokenIndex && (
            <button
              type="button"
              disabled={locked}
              onClick={() => onNavigate(tokenIndex)}
              aria-label="Edit launch configuration"
              title="Edit launch configuration"
              className={editClassName}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {items.length ? (
          <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 pb-1">
            {items.map((item) => {
              const term = summaryTerms[item.label];
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger
                    render={<div tabIndex={0} />}
                    className={cn(
                      'min-w-0 cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                      (item.label === 'Start date' || (item.value?.length ?? 0) > 12) && 'col-span-2',
                    )}
                  >
                    <dt className="whitespace-nowrap text-meta text-muted-foreground">
                      {term?.label ?? item.label}
                    </dt>
                    <dd className={cn('mt-0.5 whitespace-nowrap font-semibold leading-snug tabular-nums', item.label === 'Start date' ? 'text-sm' : 'text-mid')}>
                      {item.value}
                    </dd>
                  </TooltipTrigger>
                  {term && (
                    <TooltipContent role="tooltip" className="max-w-64 whitespace-normal text-sm leading-relaxed">
                      {term.help}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </dl>
        ) : (
          <p className="mt-2 text-small leading-relaxed text-muted-foreground">
            Your launch terms will appear here as you configure them.
          </p>
        )}
      </section>
    </aside>
  );
}
