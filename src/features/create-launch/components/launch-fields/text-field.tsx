'use client';

import { FieldLabel, Field } from '@/components/ui/field';
import { LaunchFieldError } from '../launch-motion';
import { Input } from '@/components/ui/input';

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="aria-invalid:border-input aria-invalid:ring-0"
      />
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
    </Field>
  );
}
