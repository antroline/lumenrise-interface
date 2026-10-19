'use client';

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { LaunchDraft } from '../../lib/launch-draft';
import { LaunchFieldError } from '../launch-motion';
import { FieldSurface, LaunchTextarea } from './field-controls';
import { ProjectImageField } from './project-image-field';
import { TextField } from './text-field';
import type { DraftProps } from './types';

export function ProjectDetailsStep({ draft, setDraft, errors = {} }: DraftProps) {
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
          placeholder="e.g. Tide Finance"
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
          placeholder="e.g. TIDE"
          required
          hint="1–12 letters or numbers."
          error={errors['launch-symbol']}
        />
      </FieldGroup>
      <Field data-invalid={!!errors['launch-description']}>
        <FieldSurface>
          <FieldLabel htmlFor="launch-description" className="text-small text-muted-foreground">
            Description *
          </FieldLabel>
          <LaunchTextarea
            className="h-24 min-h-24 studio-compact:h-20 studio-compact:min-h-20 resize-none rounded-none bg-transparent px-0 py-1 focus-visible:ring-0"
            id="launch-description"
            maxLength={3000}
            required
            value={draft.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="What are you building, and what is your token used for?"
            aria-invalid={!!errors['launch-description']}
            aria-describedby={errors['launch-description'] ? 'launch-description-error' : undefined}
          />
        </FieldSurface>
        <LaunchFieldError id="launch-description-error" className="text-small text-bad">{errors['launch-description']}</LaunchFieldError>
      </Field>
      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        <TextField id="launch-x" label="X account *" value={draft.xAccount} onChange={(value) => update('xAccount', value)} placeholder="https://x.com/yourproject" required maxLength={2048} error={errors['launch-x']} />
        <TextField id="launch-website" label="Website *" value={draft.website} onChange={(value) => update('website', value)} placeholder="https://yourproject.com" required maxLength={2048} error={errors['launch-website']} />
      </FieldGroup>
    </FieldGroup>
  );
}
