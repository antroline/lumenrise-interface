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
      <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4 border-b border-divider pb-7 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5">
        <Field className="w-20 sm:w-28">
          <label
            htmlFor="launch-logo"
            className="group relative grid size-20 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted transition-[border-color,background-color] hover:border-foreground hover:bg-secondary focus-within:ring-3 focus-within:ring-lime/55 sm:size-28"
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
          {errors['launch-logo'] && (
            <p id="launch-logo-error" className="text-small text-bad">
              {errors['launch-logo']}
            </p>
          )}
          {fileError && (
            <p role="alert" className="text-small text-bad">
              {fileError}
            </p>
          )}
        </Field>
        <div className="min-w-0 space-y-5">
          <Field className="min-w-0">
            <FieldLabel
              htmlFor="project-name"
              className="text-small text-muted-foreground"
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
                errors['project-name']
                  ? 'project-name-error'
                  : 'project-name-hint'
              }
              className="h-14 rounded-none border-0 border-b border-border bg-transparent px-0 text-[25px] font-semibold tracking-[-0.025em] focus-visible:border-foreground focus-visible:ring-0 aria-invalid:border-border aria-invalid:ring-0 sm:text-[32px]"
            />
            {errors['project-name'] && (
              <p id="project-name-error" className="text-small text-bad">
                {errors['project-name']}
              </p>
            )}
            <FieldDescription id="project-name-hint">
              {draft.name.length}/40 characters · also used as the Basic token
              name.
            </FieldDescription>
          </Field>
          <Field className="min-w-0">
            <FieldLabel
              htmlFor="launch-symbol"
              className="text-small text-muted-foreground"
            >
              Token symbol *
            </FieldLabel>
            <div className="flex items-center gap-2 border-b border-border focus-within:border-foreground">
              <span
                className="text-[22px] font-semibold text-muted-foreground"
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
                className="h-11 min-w-0 rounded-none border-0 bg-transparent px-0 text-[22px] font-semibold uppercase tracking-[-0.025em] focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0"
              />
            </div>
            {errors['launch-symbol'] && (
              <p id="launch-symbol-error" className="text-small text-bad">
                {errors['launch-symbol']}
              </p>
            )}
            <FieldDescription id="launch-symbol-hint">
              1–12 letters or numbers on Stellar.
            </FieldDescription>
          </Field>
        </div>
        <FieldDescription id="launch-logo-hint" className="col-span-2">
          Your image appears in this setup. Publishing it requires a media
          service. PNG, JPG or WebP · up to 1 MB.
        </FieldDescription>
      </div>
      <Field className="rounded-2xl bg-muted p-5 focus-within:ring-3 focus-within:ring-lime/40 sm:p-6">
        <FieldLabel htmlFor="launch-description">
          What is this project about? *
        </FieldLabel>
        <Textarea
          id="launch-description"
          maxLength={500}
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="A short introduction people will remember..."
          aria-invalid={!!errors['launch-description']}
          aria-describedby={
            errors['launch-description']
              ? 'launch-description-error'
              : 'launch-description-count'
          }
          className="mt-1 min-h-32 resize-none rounded-none border-0 bg-transparent px-0 text-[17px] leading-relaxed focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0"
        />
        {errors['launch-description'] && (
          <p id="launch-description-error" className="text-small text-bad">
            {errors['launch-description']}
          </p>
        )}
        <FieldDescription id="launch-description-count">
          {draft.description.length}/500 characters
        </FieldDescription>
      </Field>
      {showLinks ? (
        <div className="grid gap-5 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none sm:grid-cols-2">
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
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLinks(true)}
          className="inline-flex w-fit items-center gap-2 rounded-md text-small font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <Plus className="size-4" aria-hidden="true" /> Add X account or
          website
        </button>
      )}
    </FieldGroup>
  );
}
