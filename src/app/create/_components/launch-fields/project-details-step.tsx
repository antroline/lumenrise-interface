'use client';

import { useState } from 'react';
import { ImagePlus, Plus } from 'lucide-react';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LaunchDraft } from '../../_launch/launch-draft';
import { TextField } from './text-field';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';
import type { DraftProps } from './types';

export function ProjectDetailsStep({
  draft,
  setDraft,
  errors = {},
}: DraftProps) {
  const [fileError, setFileError] = useState('');
  const [showLinks, setShowLinks] = useState(
    Boolean(draft.xAccount || draft.website),
  );
  function update<K extends keyof LaunchDraft>(key: K, value: LaunchDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function upload(file: File | undefined) {
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setFileError('Choose a PNG, JPG or WebP image under 1 MB.');
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') update('logo', reader.result);
    };
    reader.readAsDataURL(file);
  }
  return (
    <FieldGroup className="gap-7">
      <div className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5">
        <Field className="w-20 sm:w-28">
          <label
            htmlFor="launch-logo"
            className="group relative grid size-20 cursor-pointer place-items-center overflow-hidden rounded-xl bg-surface dark:bg-muted transition-colors hover:bg-secondary focus-within:ring-3 focus-within:ring-lime/55 sm:size-28"
          >
            {draft.logo ? (
              <img
                src={draft.logo}
                alt="Project image preview"
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus
                className="size-7 text-muted-foreground transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none sm:size-8"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {draft.logo ? 'Change project image' : 'Upload project image'}
            </span>
            <input
              id="launch-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label="Project image"
              aria-invalid={!!errors['launch-logo']}
              aria-describedby={
                errors['launch-logo'] ? 'launch-logo-error' : 'launch-logo-hint'
              }
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
          <LaunchFieldError
            id="launch-logo-error"
            className="text-small text-bad"
          >
            {errors['launch-logo']}
          </LaunchFieldError>
          <LaunchFieldError role="alert" className="text-small text-bad">
            {fileError}
          </LaunchFieldError>
        </Field>
        <Field className="min-w-0" data-invalid={!!errors['project-name']}>
          <FieldLabel
            htmlFor="project-name"
            className="min-w-0 text-small text-foreground"
          >
            Project name *
          </FieldLabel>
          <Input
            id="project-name"
            value={draft.name}
            onChange={(event) => update('name', event.target.value)}
            maxLength={40}
            placeholder="Name your project"
            required
            aria-invalid={!!errors['project-name']}
            aria-describedby={
              errors['project-name'] ? 'project-name-error' : undefined
            }
            className="h-14 min-w-0 rounded-none border-0 border-b border-border bg-transparent px-0 text-[25px] font-semibold tracking-[-0.025em] focus-visible:border-foreground focus-visible:ring-0 aria-invalid:border-border aria-invalid:ring-0 sm:text-[32px]"
          />
          <LaunchFieldError
            id="project-name-error"
            className="text-small text-bad"
          >
            {errors['project-name']}
          </LaunchFieldError>
        </Field>
        <FieldDescription id="launch-logo-hint" className="sr-only">
          PNG, JPG or WebP, up to 1 MB.
        </FieldDescription>
      </div>
      <Field className="min-w-0" data-invalid={!!errors['launch-symbol']}>
        <div className="rounded-xl border border-border bg-surface dark:bg-muted px-4 py-3.5 transition-[border-color,box-shadow] duration-200 focus-within:border-foreground focus-within:ring-3 focus-within:ring-lime/40">
          <div className="flex min-h-7 min-w-0 items-center">
            <FieldLabel
              htmlFor="launch-symbol"
              className="min-w-0 text-small text-foreground"
            >
              Token symbol *
            </FieldLabel>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span
              className="text-[23px] font-semibold text-muted-foreground sm:text-[26px]"
              aria-hidden="true"
            >
              $
            </span>
            <Input
              id="launch-symbol"
              value={draft.symbol}
              onChange={(event) =>
                update('symbol', event.target.value.toUpperCase())
              }
              maxLength={12}
              placeholder="TIDE"
              required
              aria-invalid={!!errors['launch-symbol']}
              aria-describedby={
                errors['launch-symbol']
                  ? 'launch-symbol-error'
                  : 'launch-symbol-hint'
              }
              className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-[23px] font-semibold uppercase tracking-[-0.025em] focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 sm:text-[26px]"
            />
          </div>
        </div>
        <LaunchFieldError
          id="launch-symbol-error"
          className="text-small text-bad"
        >
          {errors['launch-symbol']}
        </LaunchFieldError>
        <FieldDescription id="launch-symbol-hint" className="sr-only">
          1–12 letters or numbers.
        </FieldDescription>
      </Field>
      <Field
        className="rounded-2xl bg-surface dark:bg-muted border-border border-1 p-5 focus-within:border-foreground focus-within:ring-3 focus-within:ring-lime/40 sm:p-6"
        data-invalid={!!errors['launch-description']}
      >
        <FieldLabel htmlFor="launch-description" className="text-foreground">
          Description *
        </FieldLabel>
        <Textarea
          id="launch-description"
          maxLength={500}
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Describe your project"
          aria-invalid={!!errors['launch-description']}
          aria-describedby={
            errors['launch-description']
              ? 'launch-description-error'
              : undefined
          }
          className="mt-1 min-h-32 resize-none rounded-none border-0 bg-transparent px-0 text-[17px] leading-relaxed focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0"
        />
        <LaunchFieldError
          id="launch-description-error"
          className="text-small text-bad"
        >
          {errors['launch-description']}
        </LaunchFieldError>
      </Field>
      <LaunchReveal show={showLinks}>
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="launch-x"
            label="X account (optional)"
            value={draft.xAccount}
            onChange={(value) => update('xAccount', value)}
            placeholder="https://x.com/yourproject"
            error={errors['launch-x']}
          />
          <TextField
            id="launch-website"
            label="Website (optional)"
            value={draft.website}
            onChange={(value) => update('website', value)}
            placeholder="https://yourproject.com"
            error={errors['launch-website']}
          />
        </FieldGroup>
      </LaunchReveal>
      <LaunchReveal show={!showLinks}>
        <button
          type="button"
          aria-expanded={showLinks}
          onClick={() => setShowLinks(true)}
          className="inline-flex w-fit items-center gap-2 rounded-md text-small font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> Add links
        </button>
      </LaunchReveal>
    </FieldGroup>
  );
}
