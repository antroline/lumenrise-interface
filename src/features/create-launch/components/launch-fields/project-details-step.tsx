'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { LaunchDraft } from '../../lib/launch-draft';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';
import { LaunchTextarea } from './field-controls';
import { ProjectImageField } from './project-image-field';
import { TextField } from './text-field';
import type { DraftProps } from './types';

export function ProjectDetailsStep({ draft, setDraft, errors = {} }: DraftProps) {
  const [showLinks, setShowLinks] = useState(Boolean(draft.xAccount || draft.website));
  function update<K extends keyof LaunchDraft>(key: K, value: LaunchDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <FieldGroup className="gap-4">
      <ProjectImageField value={draft.logo} onChange={(logo) => update('logo', logo)} error={errors['launch-logo']} />
      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="project-name"
          type="text"
          label="Project name *"
          value={draft.name}
          onChange={(value) => update('name', value)}
          maxLength={40}
          placeholder="Name your project"
          required
          error={errors['project-name']}
        />
        <TextField
          id="launch-symbol"
          type="text"
          label="Token symbol *"
          value={draft.symbol}
          onChange={(value) => update('symbol', value.toUpperCase())}
          maxLength={12}
          placeholder="TIDE"
          required
          hint="1–12 letters or numbers."
          error={errors['launch-symbol']}
        />
      </FieldGroup>
      <Field data-invalid={!!errors['launch-description']}>
        <FieldLabel htmlFor="launch-description">Description *</FieldLabel>
        <LaunchTextarea
          className="h-20 min-h-20 resize-none"
          id="launch-description"
          maxLength={500}
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Describe your project"
          aria-invalid={!!errors['launch-description']}
          aria-describedby={errors['launch-description'] ? 'launch-description-error' : undefined}
        />
        <LaunchFieldError id="launch-description-error" className="text-small text-bad">{errors['launch-description']}</LaunchFieldError>
      </Field>
      <LaunchReveal show={showLinks}>
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          <TextField id="launch-x" label="X account (optional)" value={draft.xAccount} onChange={(value) => update('xAccount', value)} placeholder="https://x.com/yourproject" error={errors['launch-x']} />
          <TextField id="launch-website" label="Website (optional)" value={draft.website} onChange={(value) => update('website', value)} placeholder="https://yourproject.com" error={errors['launch-website']} />
        </FieldGroup>
      </LaunchReveal>
      <LaunchReveal show={!showLinks}>
        <button type="button" aria-expanded={showLinks} onClick={() => setShowLinks(true)} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md text-small font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
          <Plus className="size-4" aria-hidden="true" /> Add links
        </button>
      </LaunchReveal>
    </FieldGroup>
  );
}
