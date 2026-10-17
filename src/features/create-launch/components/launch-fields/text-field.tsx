'use client';

import { FieldDescription, FieldLabel, Field } from '@/components/ui/field';
import { LaunchFieldError } from '../launch-motion';
import { FieldSurface, LaunchInput } from './field-controls';

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = 'url',
  maxLength,
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: 'text' | 'url';
  maxLength?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldSurface>
        <FieldLabel htmlFor={id} className="text-small text-muted-foreground">
          {label}
        </FieldLabel>
        <LaunchInput
          id={id}
          type={type}
          maxLength={maxLength}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={type === 'url' ? 'text-base font-normal' : undefined}
        />
      </FieldSurface>
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  );
}
