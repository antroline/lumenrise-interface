'use client';

import {
  LockKeyhole,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldGroup,
} from '@/components/ui/field';
import { LaunchTextarea } from './field-controls';
import { Separator } from '@/components/ui/separator';
import { ChoiceCards } from './choice-cards';
import type { DraftProps } from './types';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';

export function EligibilityStep({ draft, setDraft, errors = {} }: DraftProps) {
  const choices = [
    {
      value: 'open',
      title: 'Open to Everyone',
      detail: 'Any wallet can join.',
      icon: UsersRound,
    },
    {
      value: 'allowlist',
      title: 'Allowlist',
      detail: 'Only approved wallets can join.',
      icon: ListChecks,
      disabled: true,
    },
    {
      value: 'reputation',
      title: 'Reputation Rules',
      detail: 'Access based on selected activity.',
      icon: ShieldCheck,
      disabled: true,
      emphasis: true,
    },
    {
      value: 'custom',
      title: 'Other Verification',
      detail: 'Define your own access checks.',
      icon: ShieldCheck,
      disabled: true,
    },
  ] as const;
  return (
    <FieldGroup className="gap-5 short:gap-5">
      <ChoiceCards
        compact
        title="Participation Access"
        description="Control who can join your launch and participate."
        icon={UsersRound}
        value={draft.eligibility.mode}
        options={choices}
        onChange={(mode) =>
          setDraft((current) => ({
            ...current,
            eligibility: { ...current.eligibility, mode },
          }))
        }
      />
      <LaunchReveal show={draft.eligibility.mode !== 'open'}>
        <Field data-invalid={!!errors['eligibility-requirements']}>
          <FieldLabel htmlFor="eligibility-requirements">
            Participation requirements *
          </FieldLabel>
          <LaunchTextarea
            id="eligibility-requirements"
            maxLength={600}
            value={draft.eligibility.requirements}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                eligibility: {
                  ...current.eligibility,
                  requirements: event.target.value,
                },
              }))
            }
            placeholder="For example: wallets on our approved list, or accounts with specific Stellar activity."
            aria-invalid={!!errors['eligibility-requirements']}
            aria-describedby={
              errors['eligibility-requirements']
                ? 'eligibility-requirements-error'
                : 'eligibility-requirements-hint'
            }
          />
          <LaunchFieldError
            id="eligibility-requirements-error"
            className="text-small text-bad"
          >
            {errors['eligibility-requirements']}
          </LaunchFieldError>
          <FieldDescription id="eligibility-requirements-hint">
            Describe the rule for the future contract integration.
          </FieldDescription>
        </Field>
      </LaunchReveal>
      <Separator />
      <ChoiceCards
        compact
        title="Identification Hook"
        description="Set identity requirements for participants."
        icon={LockKeyhole}
        value={draft.eligibility.identificationMode}
        options={
          [
            {
              value: 'none',
              title: 'No Identity Check',
              detail: 'Wallet access rules are enough.',
              icon: LockKeyhole,
            },
            {
              value: 'required',
              title: 'Require Identification',
              detail: 'Set an identity rule for participants.',
              icon: ShieldCheck,
              disabled: true,
            },
          ] as const
        }
        onChange={(identificationMode) =>
          setDraft((current) => ({
            ...current,
            eligibility: { ...current.eligibility, identificationMode },
          }))
        }
      />
      <LaunchReveal show={draft.eligibility.identificationMode === 'required'}>
        <Field data-invalid={!!errors['identification-requirements']}>
          <FieldLabel htmlFor="identification-requirements">
            Identification requirements *
          </FieldLabel>
          <LaunchTextarea
            id="identification-requirements"
            maxLength={600}
            value={draft.eligibility.identificationRequirements}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                eligibility: {
                  ...current.eligibility,
                  identificationRequirements: event.target.value,
                },
              }))
            }
            placeholder="Describe the identity check and who will verify it."
            aria-invalid={!!errors['identification-requirements']}
            aria-describedby={
              errors['identification-requirements']
                ? 'identification-requirements-error'
                : 'identification-requirements-hint'
            }
          />
          <LaunchFieldError
            id="identification-requirements-error"
            className="text-small text-bad"
          >
            {errors['identification-requirements']}
          </LaunchFieldError>
          <FieldDescription id="identification-requirements-hint">
            This rule will need a connected verification service and contract
            hook before launch.
          </FieldDescription>
        </Field>
      </LaunchReveal>
    </FieldGroup>
  );
}
