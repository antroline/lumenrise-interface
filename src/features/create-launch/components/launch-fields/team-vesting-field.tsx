'use client';

import { useState } from 'react';
import { AppDialogContent, AppDialogFooter, AppDialogHeader } from '@/components/app-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { validateLaunchStep } from '../../lib/launch-validation';
import { LaunchFieldError } from '../launch-motion';
import { FieldSurface } from './field-controls';
import { NumberField } from './number-field';
import type { DraftProps } from './types';

export function TeamVestingField({ draft, setDraft, errors = {} }: DraftProps) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState({ cliffMonths: '0', vestingMonths: '0', submitted: false });
  const { cliffMonths, vestingMonths } = draft.allocation;
  const summary = Number(cliffMonths) === 0 && Number(vestingMonths) === 0
    ? 'No vesting'
    : `${cliffMonths}-month cliff · ${vestingMonths}-month vesting`;
  const proposed = { ...draft, allocation: { ...draft.allocation, cliffMonths: edit.cliffMonths, vestingMonths: edit.vestingMonths } };
  const pendingErrors = edit.submitted
    ? validateLaunchStep(proposed, 'allocation')
    : {};
  const error = errors['team-cliff'] || errors['team-vesting'];

  function save() {
    const nextErrors = validateLaunchStep(proposed, 'allocation');
    if (nextErrors['team-cliff'] || nextErrors['team-vesting']) {
      setEdit(current => ({ ...current, submitted: true }));
      requestAnimationFrame(() => document.getElementById(nextErrors['team-cliff'] ? 'team-cliff' : 'team-vesting')?.focus());
      return;
    }
    setDraft(current => ({ ...current, allocation: { ...current.allocation, cliffMonths: edit.cliffMonths.trim(), vestingMonths: edit.vestingMonths.trim() } }));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) setEdit({ cliffMonths, vestingMonths, submitted: !!error });
      setOpen(next);
    }}>
      <Field data-invalid={!!error} className="gap-1.5">
        <FieldSurface className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor="team-vesting-control" className="text-small text-muted-foreground">Team vesting</FieldLabel>
            <p className="mt-1 break-words text-ui font-medium">{summary}</p>
          </div>
          <DialogTrigger render={<Button id="team-vesting-control" type="button" variant="outline" className="min-h-11" aria-label="Configure team vesting" aria-invalid={!!error} aria-describedby={error ? 'team-vesting-control-error' : undefined} />}>
            Configure
          </DialogTrigger>
        </FieldSurface>
        <LaunchFieldError id="team-vesting-control-error" className="text-small text-bad">{error}</LaunchFieldError>
      </Field>
      <AppDialogContent>
        <AppDialogHeader title="Team vesting" description="Choose when team tokens unlock. Set both values to 0 for no vesting." />
        <FieldGroup className="gap-4">
          <NumberField id="team-cliff" label="Team Cliff" unit="months" inputMode="numeric" value={edit.cliffMonths}
            onChange={value => setEdit(current => ({ ...current, cliffMonths: value }))}
            hint="Whole months before tokens begin unlocking. 0 means no cliff." error={pendingErrors['team-cliff']} />
          <NumberField id="team-vesting" label="Team Vesting" unit="months" inputMode="numeric" value={edit.vestingMonths}
            onChange={value => setEdit(current => ({ ...current, vestingMonths: value }))}
            hint="Whole months of gradual unlocking after the cliff. 0 means no gradual vesting." error={pendingErrors['team-vesting']} />
        </FieldGroup>
        <AppDialogFooter className="sticky bottom-0 bg-popover">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" onClick={save}>Save</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
