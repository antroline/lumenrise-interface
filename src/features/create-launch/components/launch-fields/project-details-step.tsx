'use client';

import { getConfiguration } from '@/lib/api/config';
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
    <div className="grid min-w-0 gap-5 @min-[720px]/launch:grid-cols-[11rem_minmax(0,1fr)] @min-[720px]/launch:gap-8 @min-[960px]/launch:grid-cols-[13rem_minmax(0,1fr)] @min-[960px]/launch:gap-10">
      <ProjectImageField value={draft.logo} onChange={(logo) => update('logo', logo)} error={errors['launch-logo']} />
      <FieldGroup className="@container/project min-w-0 gap-3">
        <FieldGroup className="grid gap-3 @min-[28rem]/project:grid-cols-[minmax(0,1fr)_minmax(9rem,0.6fr)]">
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
              className="h-32 min-h-32 resize-none rounded-none bg-transparent px-0 py-1 text-[15px] focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 studio-compact:h-24 studio-compact:min-h-24"
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
        <FieldGroup className="grid gap-3 @min-[28rem]/project:grid-cols-2">
          <TextField id="launch-x" label={getConfiguration().rules.projectLinks.xAccountRequired ? 'X account *' : 'X account (optional)'} value={draft.xAccount} onChange={(value) => update('xAccount', value)} placeholder="https://x.com/yourproject" maxLength={getConfiguration().rules.projectLinks.maxLength} error={errors['launch-x']} />
          <TextField id="launch-website" label={getConfiguration().rules.projectLinks.websiteRequired ? 'Website *' : 'Website (optional)'} value={draft.website} onChange={(value) => update('website', value)} placeholder="https://yourproject.com" maxLength={getConfiguration().rules.projectLinks.maxLength} error={errors['launch-website']} />
        </FieldGroup>
      </FieldGroup>
    </div>
  );
}
