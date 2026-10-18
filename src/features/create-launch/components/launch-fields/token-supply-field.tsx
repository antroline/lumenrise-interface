'use client';

import { NumberField } from './number-field';
import type { DraftProps } from './types';

export function TokenSupplyField({ draft, setDraft, errors = {} }: DraftProps) {
  return (
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
  );
}
