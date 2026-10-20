'use client';

import { useState } from 'react';
import { Check, ChevronDown, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
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
  validateLaunchStage,
  type LaunchStage,
  type LaunchStageId,
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
        { label: 'Creator Tax', value: rowValue(rows, 'Creator Tax') },
        { label: 'Graduation target', value: rowValue(rows, 'Graduation target') },
        { label: 'Liquidity pool', value: rowValue(rows, 'Liquidity pool') },
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
              { label: 'Team vesting', value: rowValue(rows, 'Team vesting') },
            ]
          : []),
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
      <dt className="text-small text-muted-foreground">{label}</dt>
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
    return null;

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
                className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-card"
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

type SummaryStageProps = Pick<
  LaunchSummaryProps,
  'draft' | 'currentIndex' | 'reachedIndex' | 'locked' | 'onNavigate'
> & {
  stage: LaunchStage;
  index: number;
  open: boolean;
  onToggle: () => void;
};

function SummaryStage({
  draft,
  stage,
  index,
  currentIndex,
  reachedIndex,
  locked,
  onNavigate,
  open,
  onToggle,
}: SummaryStageProps) {
  const active = index === currentIndex;
  const reached = index <= reachedIndex;
  const items = reached
    ? stageChecklist(draft, stage).filter((item) => item.value)
    : [];
  const expanded = items.length > 0 && open;
  const complete =
    index < currentIndex &&
    Object.keys(validateLaunchStage(draft, stage)).length === 0;
  const status = active
    ? 'Current'
    : complete
      ? 'Complete'
      : index < currentIndex
        ? 'Needs review'
        : 'Upcoming';
  const panelId = `launch-summary-${stage.id}`;

  return (
    <li
      aria-current={active ? 'step' : undefined}
      className="min-w-0 border-b border-divider py-1 last:border-0"
    >
      <div className="flex min-h-11 items-center gap-1">
        <button
          type="button"
          disabled={!items.length}
          aria-expanded={items.length ? expanded : undefined}
          aria-controls={items.length ? panelId : undefined}
          onClick={onToggle}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left outline-none enabled:cursor-pointer  focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid size-5 shrink-0 place-items-center rounded-full text-meta font-medium tabular-nums',
              active
                ? 'bg-foreground text-background'
                : complete
                  ? 'text-ok'
                  : 'text-muted-foreground',
            )}
          >
            {complete ? <Check className="size-3.5" /> : index + 1}
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 text-small font-medium',
              active || complete ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {stage.label}
            <span className="sr-only">: {status}</span>
          </span>
          {active && (
            <span
              aria-hidden="true"
              className="text-meta text-muted-foreground"
            >
              Current
            </span>
          )}
          {items.length > 0 && (
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 shrink-0 text-muted-foreground',
                expanded && 'rotate-180',
              )}
            />
          )}
        </button>
        {index < currentIndex && (
          <button
            type="button"
            disabled={locked}
            onClick={() => onNavigate(index)}
            aria-label={`Edit: ${stage.label}`}
            title={`Edit ${stage.label.toLowerCase()}`}
            className={editClassName}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {expanded && (
        <dl
          id={panelId}
          className="flex min-w-0 flex-col gap-2 pb-3 text-small"
        >
          {items.map((item) => (
            <div
              key={item.label}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2"
            >
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function LaunchSummary({
  draft,
  steps,
  currentIndex,
  reachedIndex,
  locked,
  onNavigate,
}: LaunchSummaryProps) {
  // Manual toggles last only for the current step; Review opens all entered details.
  const [toggles, setToggles] = useState<{
    index: number;
    open: Partial<Record<LaunchStageId, boolean>>;
  }>({ index: currentIndex, open: {} });
  const overrides = toggles.index === currentIndex ? toggles.open : {};
  const isOpen = (stage: LaunchStage, index: number) =>
    overrides[stage.id] ??
    (index === currentIndex || steps[currentIndex]?.id === 'review');

  return (
    <aside
      aria-label="Your launch summary"
      className="order-last hidden max-h-full min-h-0 min-w-0 flex-col self-start rounded-2xl border border-border bg-card p-4 lg:flex"
    >
      <LaunchSummaryHeader
        draft={draft}
        reachedIndex={reachedIndex}
        onEdit={() => onNavigate(projectIndex)}
        locked={locked}
      />
      <div className="shrink-0 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-body font-semibold">Your launch</h2>
          <span className="text-small tabular-nums text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((stage, index) => (
            <span
              key={stage.id}
              className={cn(
                'h-1 flex-1 rounded-full',
                index === currentIndex
                  ? 'bg-primary'
                  : index < currentIndex
                    ? 'bg-foreground/50'
                    : 'bg-secondary',
              )}
            />
          ))}
        </div>
      </div>
      <nav
        aria-label="Launch steps and summary"
        className="mt-2 min-h-0 min-w-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
      >
        <ol className="flex min-w-0 flex-col">
          {steps.map((stage, index) => stage.id !== 'review' && (
            <SummaryStage
              key={stage.id}
              draft={draft}
              stage={stage}
              index={index}
              currentIndex={currentIndex}
              reachedIndex={reachedIndex}
              locked={locked}
              open={isOpen(stage, index)}
              onToggle={() =>
                setToggles({
                  index: currentIndex,
                  open: { ...overrides, [stage.id]: !isOpen(stage, index) },
                })
              }
              onNavigate={onNavigate}
            />
          ))}
        </ol>
      </nav>
    </aside>
  );
}
