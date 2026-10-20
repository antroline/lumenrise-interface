'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
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
    <Field
      orientation="horizontal"
      className="min-w-0 items-center gap-4 self-start @min-[720px]/launch:flex-col @min-[720px]/launch:items-stretch @min-[720px]/launch:gap-3"
      data-invalid={!!error || !!fileError}
    >
      <label
        htmlFor="launch-logo"
        className={cn(
          'group relative grid size-18 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed transition-[background-color,border-color,box-shadow] focus-within:ring-3 focus-within:ring-lime/40 @min-[720px]/launch:aspect-square @min-[720px]/launch:size-auto @min-[720px]/launch:w-full @min-[720px]/launch:rounded-2xl',
          value ? 'border-transparent bg-secondary/60' : 'border-border bg-secondary/60 hover:border-foreground/30 hover:bg-secondary',
          (error || fileError) && 'border-bad/60',
        )}
      >
        {value ? <img src={value} alt="Project image preview" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground transition-colors group-hover:text-foreground @min-[720px]/launch:size-8" aria-hidden="true" />}
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
