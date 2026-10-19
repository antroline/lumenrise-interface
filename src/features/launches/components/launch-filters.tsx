'use client';

import { useState } from 'react';
import { Asset, Networks, StrKey } from '@stellar/stellar-sdk';
import {
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { pairLabel } from '@/lib/api/launches/display';
import {
  monetarySort,
  activeDirectoryFilterCount,
  launchSortLabels,
  type DirectoryRequest,
  type DirectorySort,
} from '../lib/directory';

const sorts: DirectorySort[] = [
  'trending',
  'newest',
  'topVolume',
  'almostGraduated',
  'name',
  'symbol',
  'participants',
  'figure',
  'phase',
  'category',
];
const categories: {
  value: DirectoryRequest['category'];
  label: string;
  disabled?: boolean;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'bonding-curve', label: 'Bonding Curve' },
  { value: 'auction', label: 'Auction', disabled: true },
  { value: 'pre-sale', label: 'Presale', disabled: true },
];
const chipClass = 'pointer-coarse:min-h-11';
function paymentAssets(network: DirectoryRequest['network']) {
  return [
    {
      value: Asset.native().contractId(
        network === 'public' ? Networks.PUBLIC : Networks.TESTNET,
      ),
      label: 'XLM',
    },
    ...(network === 'testnet'
      ? [
          {
            value: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            label: 'USDC',
          },
        ]
      : []),
  ];
}
function customAsset(request: DirectoryRequest) {
  return (
    !!request.pair &&
    !paymentAssets(request.network).some(
      (asset) => asset.value === request.pair,
    )
  );
}

export function LaunchFilters({
  request,
  open,
  onOpenChange,
  onApply,
}: {
  request: DirectoryRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (request: DirectoryRequest) => Promise<void>;
}) {
  // Page navigation does not discard unsubmitted edits. Applied filter changes do.
  const source = JSON.stringify({ ...request, page: 1 });
  const [state, setState] = useState({
    source,
    value: request,
    custom: customAsset(request),
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (state.source !== source) {
    setState({ source, value: request, custom: customAsset(request) });
    setError(null);
  }
  const draft = state.source === source ? state.value : request;
  const assets = paymentAssets(draft.network);
  const activeCount = activeDirectoryFilterCount(request);
  function update(changes: Partial<DirectoryRequest>) {
    setState((current) => ({
      ...current,
      value: { ...current.value, ...changes },
    }));
    setError(null);
  }
  function changeNetwork(value: string) {
    if (value !== 'testnet' && value !== 'public') return;
    const nativePair =
      draft.pair === assets[0].value ? paymentAssets(value)[0].value : '';
    setState((current) => ({
      ...current,
      custom: false,
      value: {
        ...current.value,
        network: value,
        pair: nativePair,
        sort:
          monetarySort(current.value.sort) && !nativePair
            ? 'newest'
            : current.value.sort,
      },
    }));
    setError(null);
  }
  function reset() {
    setState((current) => ({
      ...current,
      custom: false,
      value: {
        network: current.value.network,
        page: 1,
        limit: 20,
        owner: '',
        search: '',
        pair: '',
        category: 'all',
        sort: 'newest',
        direction: 'desc',
      },
    }));
    setError(null);
  }
  async function apply() {
    if (pending) return;
    const next = {
      ...draft,
      owner: draft.owner?.trim(),
      pair: draft.pair?.trim(),
      page: 1,
    };
    if (
      (next.pair && !StrKey.isValidContract(next.pair)) ||
      (monetarySort(next.sort) && !next.pair) ||
      (state.custom && !next.pair)
    ) {
      setError(
        'Choose a valid payment-asset contract on the selected network.',
      );
      setAdvancedOpen(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onApply(next);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not apply filters. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative pointer-coarse:size-11"
                />
              }
            />
          }
          aria-label={
            activeCount ? `Filters, ${activeCount} active filters` : 'Filters'
          }
        >
          <SlidersHorizontal aria-hidden="true" />
          {activeCount > 0 && (
            <Badge
              variant="lime"
              size="sm"
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 px-1 tabular-nums"
            >
              {activeCount}
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>Filters</TooltipContent>
      </Tooltip>
      <SheetContent className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-md motion-reduce:transition-none">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-14">
          <SheetTitle>Launch Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Choose filters, then apply them together to update the projects.
          </SheetDescription>
        </SheetHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
            data-launch-filter-scroll
          >
            <fieldset disabled={pending} className="min-w-0">
              <legend className="sr-only">Launch filters</legend>
              <FieldGroup className="gap-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="launch-search">
                    Search projects
                  </FieldLabel>
                  <InputGroup className="h-9 pointer-coarse:h-11">
                    <InputGroupAddon>
                      <Search aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="launch-search"
                      type="search"
                      maxLength={100}
                      value={draft.search}
                      placeholder="Name or symbol"
                      onChange={(event) =>
                        update({ search: event.target.value })
                      }
                    />
                  </InputGroup>
                </Field>
                <FieldSet className="gap-1.5">
                  <FieldLegend variant="label">Category</FieldLegend>
                  <ToggleGroup
                    aria-label="Category"
                    variant="chip"
                    value={[draft.category]}
                    onValueChange={(values) => {
                      const category = categories.find(
                        (item) => item.value === values[0] && !item.disabled,
                      );
                      if (category)
                        update({
                          category: category.value,
                        });
                    }}
                    className="max-w-full flex-wrap"
                    spacing={1.5}
                  >
                    {categories.map((item) => (
                      <ToggleGroupItem
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        title={item.disabled ? 'Not available yet' : undefined}
                        className={chipClass}
                      >
                        {item.label}
                        {item.disabled && (
                          <span className="sr-only"> — not available yet</span>
                        )}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
                <FieldSet className="gap-1.5">
                  <FieldLegend variant="label">Network</FieldLegend>
                  <ToggleGroup
                    aria-label="Network"
                    value={[draft.network]}
                    onValueChange={(values) => {
                      if (values[0]) changeNetwork(values[0]);
                    }}
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="public"
                      className="flex-1 pointer-coarse:min-h-11"
                    >
                      Mainnet
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="testnet"
                      className="flex-1 pointer-coarse:min-h-11"
                    >
                      Testnet
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
                <FieldSet className="gap-2">
                  <FieldLegend variant="label">Sort by</FieldLegend>
                  <ToggleGroup
                    aria-label="Sort"
                    variant="chip"
                    value={[draft.sort]}
                    onValueChange={(values) => {
                      const sort = sorts.find((item) => item === values[0]);
                      if (sort) update({ sort, direction: 'desc' });
                    }}
                    className="max-w-full flex-wrap"
                    spacing={1.5}
                  >
                    {sorts.map((sort) => (
                      <ToggleGroupItem
                        key={sort}
                        value={sort}
                        className={chipClass}
                      >
                        {launchSortLabels[sort]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      id="launch-direction-label"
                      className="text-xs text-muted-foreground"
                    >
                      Direction
                    </span>
                    <ToggleGroup
                      aria-labelledby="launch-direction-label"
                      value={[draft.direction]}
                      onValueChange={(values) => {
                        if (values[0] === 'asc' || values[0] === 'desc')
                          update({ direction: values[0] });
                      }}
                    >
                      <ToggleGroupItem
                        value="asc"
                        aria-label="Ascending"
                        title="Ascending"
                        className="w-8 px-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                      >
                        <ArrowUp aria-hidden="true" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="desc"
                        aria-label="Descending"
                        title="Descending"
                        className="w-8 px-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                      >
                        <ArrowDown aria-hidden="true" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </FieldSet>
                <Accordion
                  title="Advanced Filters"
                  variant="plain"
                  open={advancedOpen}
                  onOpenChange={setAdvancedOpen}
                  className="border-t border-border pt-1"
                >
                  <FieldGroup className="gap-3">
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="launch-owner">
                        Owner Address
                      </FieldLabel>
                      <Input
                        id="launch-owner"
                        value={draft.owner ?? ''}
                        placeholder="Wallet or contract address"
                        className="h-9 pointer-coarse:h-11"
                        onChange={(event) =>
                          update({ owner: event.target.value })
                        }
                      />
                    </Field>
                    <FieldSet className="gap-1.5">
                      <FieldLegend variant="label">Payment Asset</FieldLegend>
                      <ToggleGroup
                        aria-label="Payment asset"
                        variant="chip"
                        value={[state.custom ? 'custom' : draft.pair || 'any']}
                        onValueChange={(values) => {
                          const value = values[0];
                          if (value === undefined) return;
                          if (value === 'custom') {
                            setState((current) => ({
                              ...current,
                              custom: true,
                              value: {
                                ...current.value,
                                pair: customAsset(current.value)
                                  ? current.value.pair
                                  : '',
                              },
                            }));
                            setError(null);
                          } else {
                            setState((current) => ({
                              ...current,
                              custom: false,
                              value: {
                                ...current.value,
                                pair: value === 'any' ? '' : value,
                              },
                            }));
                            setError(null);
                          }
                        }}
                        className="max-w-full flex-wrap"
                        spacing={1.5}
                      >
                        <ToggleGroupItem value="any" className={chipClass}>
                          Any asset
                        </ToggleGroupItem>
                        {assets.map((asset) => (
                          <ToggleGroupItem
                            key={asset.value}
                            value={asset.value}
                            className={chipClass}
                          >
                            {asset.label}
                          </ToggleGroupItem>
                        ))}
                        <ToggleGroupItem value="custom" className={chipClass}>
                          Other contract
                        </ToggleGroupItem>
                      </ToggleGroup>
                      {monetarySort(draft.sort) && (
                        <p className="text-xs text-muted-foreground">
                          A payment asset is required for this ranking.
                        </p>
                      )}
                    </FieldSet>
                    {state.custom && (
                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="launch-custom-pair">
                          Payment contract
                        </FieldLabel>
                        <Input
                          id="launch-custom-pair"
                          value={draft.pair ?? ''}
                          placeholder="Contract ID on selected network"
                          aria-describedby={
                            error ? 'launch-filter-error' : undefined
                          }
                          className="h-9 pointer-coarse:h-11"
                          onChange={(event) =>
                            update({ pair: event.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {draft.pair && StrKey.isValidContract(draft.pair)
                            ? pairLabel(draft.pair, draft.network)
                            : 'Use a contract address from the selected network.'}
                        </p>
                      </Field>
                    )}
                    <FieldSet className="gap-1.5">
                      <FieldLegend variant="label">
                        Projects per page
                      </FieldLegend>
                      <ToggleGroup
                        aria-label="Projects per page"
                        value={[String(draft.limit)]}
                        onValueChange={(values) => {
                          const value = Number(values[0]);
                          if (
                            Number.isInteger(value) &&
                            value >= 1 &&
                            value <= 100
                          )
                            update({ limit: value });
                        }}
                      >
                        {[...new Set([20, 50, 100, request.limit])].map(
                          (limit) => (
                            <ToggleGroupItem
                              key={limit}
                              value={String(limit)}
                              className={chipClass}
                            >
                              {limit}
                            </ToggleGroupItem>
                          ),
                        )}
                      </ToggleGroup>
                    </FieldSet>
                  </FieldGroup>
                </Accordion>
              </FieldGroup>
            </fieldset>
          </div>
          <footer
            className="shrink-0 border-t border-border bg-popover px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-launch-filter-footer
          >
            {error && (
              <p
                id="launch-filter-error"
                role="alert"
                className="mb-3 text-xs text-destructive"
              >
                {error}
              </p>
            )}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={reset}
                className="pointer-coarse:min-h-11"
              >
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending}
                loading={pending}
                className="pointer-coarse:min-h-11"
              >
                {pending ? 'Applying…' : 'Apply Filters'}
              </Button>
            </div>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}
