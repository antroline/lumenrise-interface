'use client';

import {
  BadgeCheck,
  ListChecks,
  ShieldCheck,
  Unlock,
  UsersRound,
} from 'lucide-react';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceCards } from './choice-cards';
import type { DraftProps } from './types';

export function EligibilityStep({ draft, setDraft, errors = {} }: DraftProps) {
  const choices = [
    {
      value: 'open',
      title: 'Open to everyone',
      detail: 'Any wallet can join.',
      icon: UsersRound,
    },
    {
      value: 'allowlist',
      title: 'Allowlist',
      detail: 'Only approved wallets can join.',
      icon: ListChecks,
    },
    {
      value: 'reputation',
      title: 'Reputation rules',
      detail: 'Access based on selected activity.',
      icon: BadgeCheck,
    },
    {
      value: 'custom',
      title: 'Other verification',
      detail: 'Define your own access checks.',
      icon: ShieldCheck,
    },
  ] as const;
  return (
    <FieldGroup>
      <ChoiceCards
        title={
          draft.method === 'auction'
            ? 'Verification hook'
            : 'Participation access'
        }
        value={draft.eligibility.mode}
        options={choices}
        onChange={(mode) =>
          setDraft((current) => ({
            ...current,
            eligibility: { ...current.eligibility, mode },
          }))
        }
      />
      {draft.eligibility.mode !== 'open' && (
        <Field>
          <FieldLabel htmlFor="eligibility-requirements">
            Participation requirements *
          </FieldLabel>
          <Textarea
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
            className="aria-invalid:border-input aria-invalid:ring-0"
          />
          {errors['eligibility-requirements'] && (
            <p
              id="eligibility-requirements-error"
              className="text-small text-bad"
            >
              {errors['eligibility-requirements']}
            </p>
          )}
          <FieldDescription id="eligibility-requirements-hint">
            Describe the rule for the future contract integration.
          </FieldDescription>
        </Field>
      )}
      {draft.method === 'auction' && (
        <>
          <ChoiceCards
            title="Identification hook"
            value={draft.auction.identificationMode}
            options={
              [
                {
                  value: 'none',
                  title: 'No identity check',
                  detail: 'Wallet access rules are enough.',
                  icon: Unlock,
                },
                {
                  value: 'required',
                  title: 'Require identification',
                  detail: 'Set an identity rule for participants.',
                  icon: ShieldCheck,
                },
              ] as const
            }
            onChange={(identificationMode) =>
              setDraft((current) => ({
                ...current,
                auction: { ...current.auction, identificationMode },
              }))
            }
          />
          {draft.auction.identificationMode === 'required' && (
            <Field>
              <FieldLabel htmlFor="identification-requirements">
                Identification requirements *
              </FieldLabel>
              <Textarea
                id="identification-requirements"
                maxLength={600}
                value={draft.auction.identificationRequirements}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    auction: {
                      ...current.auction,
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
                className="aria-invalid:border-input aria-invalid:ring-0"
              />
              {errors['identification-requirements'] && (
                <p
                  id="identification-requirements-error"
                  className="text-small text-bad"
                >
                  {errors['identification-requirements']}
                </p>
              )}
              <FieldDescription id="identification-requirements-hint">
                This rule will need a connected verification service and
                contract hook before launch.
              </FieldDescription>
            </Field>
          )}
        </>
      )}
    </FieldGroup>
  );
}
