'use client';

import { FieldGroup } from '@/components/ui/field';
import { formatAmount } from '../../_launch/launch-draft';
import { NumberField } from './number-field';
import type { DraftProps } from './types';

export function TokenSetupStep({ draft, setDraft, errors = {} }: DraftProps) {
  return (
    <FieldGroup className="gap-7">
      <div>
        <NumberField
          id="launch-supply"
          label="Total supply"
          value={draft.supply}
          onChange={(supply) => setDraft((current) => ({ ...current, supply }))}
          unit={draft.symbol || 'tokens'}
          help="Choose a preset or enter an exact supply. You can change it before launching."
          groupThousands
          error={errors['launch-supply']}
          presets={[
            { label: '10M', value: '10000000' },
            { label: '100M', value: '100000000' },
            { label: '1B', value: '1000000000' },
            { label: '10B', value: '10000000000' },
            { label: '100B', value: '100000000000' },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-divider pt-4">
          <span className="text-small text-muted-foreground">
            Your token supply
          </span>
          <strong className="break-all text-[20px] font-semibold tracking-[-0.02em] tabular-nums">
            {formatAmount(draft.supply)}{' '}
            <span className="text-small text-muted-foreground">
              {draft.symbol || 'tokens'}
            </span>
          </strong>
        </div>
      </div>
    </FieldGroup>
  );
}
