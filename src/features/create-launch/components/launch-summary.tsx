'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ImagePlus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  launchDurationOptions,
  methodLabels,
  numberValue,
  validPositive,
  validSupply,
  type LaunchDraft,
} from '../lib/launch-draft';
import { launchTransition, useLaunchReducedMotion } from '../lib/launch-motion';
import { launchSummaryRows, type LaunchSummaryRow } from '../lib/launch-summary';
import {
  launchStages,
  validateLaunchStage,
  type LaunchStage,
  type LaunchStageId,
} from '../lib/launch-stages';
import { QuoteIcon } from './launch-fields/quote-icon';

export type LaunchSummaryProps = {
  draft: LaunchDraft;
  steps: readonly LaunchStage[];
  currentIndex: number;
  reachedIndex: number;
  locked: boolean;
  onNavigate: (index: number) => void;
};

type ChecklistItem = { label: string; value?: string };

const settingsIndex = launchStages.findIndex((stage) => stage.id === 'settings');
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

function rowValue(rows: LaunchSummaryRow[], label: string) {
  return rows.find((row) => row.label === label)?.value;
}

function stageChecklist(draft: LaunchDraft, stage: LaunchStage): ChecklistItem[] {
  switch (stage.id) {
    case 'project': {
      const rows = launchSummaryRows(draft, 'project');
      return [
        { label: 'Project image', value: draft.logo ? 'Added' : undefined },
        { label: 'Name', value: rowValue(rows, 'Name') },
        { label: 'Symbol', value: rowValue(rows, 'Symbol') },
        { label: 'Description', value: draft.description.trim() ? 'Added' : undefined },
      ];
    }
    case 'token': {
      const rows = launchSummaryRows(draft, 'token');
      const { saleShare, poolShare, teamShare } = draft.allocation;
      return [
        { label: 'Method', value: draft.methodSelected ? methodLabels[draft.method] : undefined },
        { label: 'Supply', value: rowValue(rows, 'Supply') },
        { label: 'Split', value: rowValue(rows, 'Bonding curve') && `${saleShare} / ${poolShare} / ${teamShare}%` },
        ...(numberValue(teamShare) > 0 ? [{ label: 'Team vesting', value: rowValue(rows, 'Team vesting') }] : []),
      ];
    }
    case 'settings': {
      const rows = [...launchSummaryRows(draft, 'sale'), ...launchSummaryRows(draft, 'settings')];
      return [
        { label: 'Pay with', value: draft.quote },
        { label: 'Target', value: rowValue(rows, 'Raise target') },
        { label: 'Starts', value: rowValue(rows, 'Starts') },
        { label: 'Ends', value: rowValue(rows, 'Ends') },
        { label: 'Creator fee', value: rowValue(rows, 'Creator fee') },
      ];
    }
    case 'review':
      return [];
  }
}

function summaryChips(draft: LaunchDraft, reachedIndex: number) {
  const planReached = reachedIndex >= settingsIndex;
  const duration = launchDurationOptions.find((option) => option.value === draft.bonding.durationDays)?.label;
  return [
    ...(draft.methodSelected ? [{ key: 'method', label: methodLabels[draft.method] }] : []),
    ...(planReached ? [{ key: 'quote', label: draft.quote, quote: true }] : []),
    ...(planReached ? [{ key: 'duration', label: draft.bonding.endsAt ? 'Custom end' : duration ?? '2 weeks' }] : []),
    ...(numberValue(draft.allocation.teamShare) > 0 ? [{ key: 'team', label: `Team ${draft.allocation.teamShare}%` }] : []),
    ...(planReached && draft.bonding.creatorFee ? [{ key: 'fee', label: 'Creator fee' }] : []),
  ];
}

function SummaryFigure({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-mid font-semibold tabular-nums">
        {value ?? <span className="text-muted-foreground">—</span>}
        {value && <span className="text-small font-medium tracking-normal text-muted-foreground"> {unit}</span>}
      </dd>
    </div>
  );
}

/** Identity block shared by the desktop summary and the compact stepper menu. */
export function LaunchSummaryHeader({ draft, reachedIndex }: { draft: LaunchDraft; reachedIndex: number }) {
  const reduced = useLaunchReducedMotion();
  const name = draft.name.trim();
  const chips = summaryChips(draft, reachedIndex);
  const transition = reduced ? { duration: 0 } : launchTransition;

  return (
    <div className="rounded-xl bg-secondary p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-card">
          {draft.logo
            ? <img src={draft.logo} alt="" className="size-full object-cover" />
            : <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-title font-semibold', !name && 'text-muted-foreground')}>
            {name || 'Untitled launch'}
          </p>
          <p className="mt-0.5 truncate text-small tabular-nums text-muted-foreground">
            {draft.symbol ? `$${draft.symbol}` : 'No symbol yet'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-small text-muted-foreground">Included in this launch</p>
      {chips.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
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
                {'quote' in chip && <QuoteIcon quote={draft.quote} className="size-3.5" />}
                {chip.label}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="mt-1.5 text-small text-muted-foreground">Your choices appear here as you set them.</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <SummaryFigure label="Supply" value={validSupply(draft.supply) ? compactNumber.format(Number(draft.supply)) : null} unit={draft.symbol || 'tokens'} />
        <SummaryFigure label="Target" value={validPositive(draft.bonding.target) ? compactNumber.format(Number(draft.bonding.target)) : null} unit={`/ ${draft.quote}`} />
      </dl>
    </div>
  );
}

type SummaryStageProps = Pick<LaunchSummaryProps, 'draft' | 'currentIndex' | 'reachedIndex' | 'locked' | 'onNavigate'> & {
  stage: LaunchStage;
  index: number;
  open: boolean;
  onToggle: () => void;
};

function SummaryStage({ draft, stage, index, currentIndex, reachedIndex, locked, onNavigate, open, onToggle }: SummaryStageProps) {
  const reduced = useLaunchReducedMotion();
  const active = index === currentIndex;
  const reached = index <= reachedIndex;
  const items = reached ? stageChecklist(draft, stage) : [];
  const done = items.filter((item) => item.value).length;
  const expandable = items.length > 0;
  const expanded = expandable && open;
  const canEdit = index < currentIndex && !locked;
  const complete = index < reachedIndex && Object.keys(validateLaunchStage(draft, stage)).length === 0;
  const panelId = `launch-summary-${stage.id}`;

  return (
    <li aria-current={active ? 'step' : undefined} className="min-w-0 border-b border-divider last:border-0">
      <div className="flex min-h-11 items-center gap-1">
        <button
          type="button"
          disabled={!expandable}
          aria-expanded={expandable ? expanded : undefined}
          aria-controls={expandable ? panelId : undefined}
          onClick={onToggle}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left text-ui font-medium outline-none transition-colors enabled:cursor-pointer enabled:hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-foreground motion-reduce:transition-none"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180', !expandable && 'opacity-40')}
          />
          <span className={cn('min-w-0 truncate', reached ? 'text-foreground' : 'text-muted-foreground')}>
            {active && <span className="sr-only">Current step: </span>}
            {stage.label}
          </span>
          <span className="ml-auto flex shrink-0 items-center text-small tabular-nums text-muted-foreground">
            {active ? (
              <span className="inline-flex h-5 items-center gap-1 rounded-full bg-foreground px-1.5 text-meta font-medium text-background">
                <span className="size-1.5 rounded-full bg-lime" aria-hidden="true" />
                Now
              </span>
            ) : !reached ? (
              `Step ${index + 1}`
            ) : complete ? (
              <Check className="size-4 text-ok" aria-label="Complete" />
            ) : (
              <span>
                {done}/{items.length}
                <span className="sr-only"> set</span>
              </span>
            )}
          </span>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => onNavigate(index)}
            aria-label={`Edit: ${stage.label}`}
            title={`Edit ${stage.label.toLowerCase()}`}
            className="grid size-11 shrink-0 [@media(hover:hover)]:size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground motion-reduce:transition-none"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : launchTransition}
            className="overflow-hidden"
          >
            <dl className="flex flex-col gap-2 pb-3 pl-7 pr-1.5 text-small">
              {items.map((item) => (
                <div key={item.label} className="flex min-w-0 items-start justify-between gap-3">
                  <dt className="min-w-0 text-muted-foreground">{item.label}</dt>
                  <dd className="min-w-0 max-w-[62%] break-words text-right font-medium tabular-nums">
                    {item.value ?? (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Not set</span>
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function LaunchSummary({ draft, steps, currentIndex, reachedIndex, locked, onNavigate }: LaunchSummaryProps) {
  // Manual toggles last only for the current step; moving on reopens the new current step.
  const [toggles, setToggles] = useState<{ index: number; open: Partial<Record<LaunchStageId, boolean>> }>({ index: currentIndex, open: {} });
  const overrides = toggles.index === currentIndex ? toggles.open : {};
  const isOpen = (stage: LaunchStage, index: number) => overrides[stage.id] ?? index === currentIndex;

  return (
    <aside
      aria-label="Your launch summary"
      className="sticky top-18 order-last hidden max-h-[calc(100svh-5.5rem)] min-h-0 min-w-0 flex-col self-start rounded-2xl border border-border bg-card p-2 lg:top-4 lg:max-h-[calc(100svh-2rem)] @min-[800px]/studio:flex"
    >
      <LaunchSummaryHeader draft={draft} reachedIndex={reachedIndex} />
      <div className="shrink-0 px-1.5 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-body font-semibold">Your launch</h2>
          <span className="text-small tabular-nums text-muted-foreground">
            {currentIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((stage, index) => (
            <span key={stage.id} className={cn('h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none', index <= currentIndex ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </div>
      </div>
      <nav
        aria-label="Launch steps and summary"
        className="mt-1 min-h-24 min-w-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-5 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)] [scrollbar-width:thin]"
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
              onToggle={() => setToggles({ index: currentIndex, open: { ...overrides, [stage.id]: !isOpen(stage, index) } })}
              onNavigate={onNavigate}
            />
          ))}
        </ol>
      </nav>
    </aside>
  );
}
