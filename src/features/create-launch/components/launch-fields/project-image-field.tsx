'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { LaunchFieldError } from '../launch-motion';

export function ProjectImageField({ value, onChange, error }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [fileError, setFileError] = useState('');

  function upload(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setFileError('Choose a PNG, JPG or WebP image under 1 MB.');
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.onerror = () => setFileError('The image could not be read. Choose it again or try another image.');
    reader.readAsDataURL(file);
  }

  return (
    <Field orientation="horizontal" className="items-center gap-4" data-invalid={!!error || !!fileError}>
      <label htmlFor="launch-logo" className="group relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl bg-secondary/70 transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-foreground/20">
        {value ? <img src={value} alt="Project image preview" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />}
        <span className="sr-only">{value ? 'Change project image' : 'Upload project image'}</span>
        <input
          id="launch-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Project image"
          aria-invalid={!!error || !!fileError}
          aria-describedby={error || fileError ? 'launch-logo-error' : 'launch-logo-hint'}
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        <FieldLabel htmlFor="launch-logo">Project image *</FieldLabel>
        <FieldDescription id="launch-logo-hint">PNG, JPG or WebP, up to 1 MB.</FieldDescription>
        <LaunchFieldError id="launch-logo-error" role="alert" className="text-small text-bad">{fileError || error}</LaunchFieldError>
      </div>
    </Field>
  );
}
