'use client';

import type { LaunchMethod } from '../lib/launch-draft';
import { MethodCard } from './method-card';
import { LaunchFieldError } from './launch-motion';

const methods = [
  { method: 'bonding', detail: 'Price follows demand.' },
  { method: 'fixed', detail: 'One price per token.' },
  { method: 'auction', detail: 'Bids set the price.' },
] as const;

export function MethodChoice({ selected, onChoose, error }: {
  selected: LaunchMethod | null;
  onChoose: () => void;
  error?: string;
}) {
  return (
    <fieldset id="launch-methods" tabIndex={-1} aria-describedby={error ? 'launch-methods-error' : undefined} className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-foreground">
      <legend className="mb-3 studio-compact:mb-2 text-sm font-medium">Launch method</legend>
      <div className="grid gap-2 @min-[480px]/launch:grid-cols-3">
        {methods.map(({ method, detail }) => (
          <MethodCard key={method} method={method} detail={detail} selected={selected === method} onChoose={method === 'bonding' ? onChoose : undefined} />
        ))}
      </div>
      <LaunchFieldError id="launch-methods-error" className="mt-2 text-small text-bad">{error}</LaunchFieldError>
    </fieldset>
  );
}
