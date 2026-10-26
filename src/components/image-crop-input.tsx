'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Crop, RotateCcw } from 'lucide-react';
import { AppDialogContent, AppDialogFooter, AppDialogHeader } from '@/components/app-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getConfiguration } from '@/lib/api/config';
import { validateImage } from '@/lib/client-rules';

type ImageKind = 'avatar' | 'tokenImage' | 'teamImage';

/** Every image picker confirms a crop before handing a file to its existing upload flow. */
export function ImageCropInput({ kind, onCropped, onError, ...props }: Omit<ComponentProps<'input'>, 'type' | 'onChange' | 'accept' | 'onError'> & {
  kind: ImageKind;
  onCropped: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null);
  const [open, setOpen] = useState(false);
  const version = useRef(0);
  const selectedVersion = version.current;
  useEffect(() => () => { version.current++; }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);

  async function select(file?: File) {
    if (!file) return;
    const current = ++version.current;
    const issue = await validateImage(file, kind);
    if (current !== version.current) return;
    if (issue) { onError(issue); return; }
    onError('');
    setSource({ file, url: URL.createObjectURL(file) });
    setOpen(true);
  }

  function close() {
    // Invalidate preparation/selection work without removing the exiting editor.
    version.current++;
    setOpen(false);
  }

  return <>
    <input {...props} type="file" accept={getConfiguration().rules.images.mimeTypes.join(',')} onChange={(event) => {
      void select(event.target.files?.[0]);
      event.target.value = '';
    }} />
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }} onOpenChangeComplete={(next) => {
      if (!next && !open) setSource(null);
    }}>
      {source && <ImageCropEditor key={source.url} source={source} kind={kind} onCancel={close} onConfirm={(file) => {
        if (!open || selectedVersion !== version.current) return;
        onCropped(file);
        close();
      }} />}
    </Dialog>
  </>;
}

function ImageCropEditor({ source, kind, onCancel, onConfirm }: {
  source: { file: File; url: string };
  kind: ImageKind;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const minimum = Math.max(getConfiguration().rules.images.minWidth, getConfiguration().rules.images.minHeight);
  const side = Math.min(dimensions.width, dimensions.height) / zoom;
  const maxZoom = Math.max(1, Math.min(4, Math.min(dimensions.width, dimensions.height) / minimum));
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  async function confirm() {
    const image = imageRef.current;
    if (!image || !side || busy) return;
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(Math.floor(side), Math.max(1024, minimum));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The image editor is unavailable. Try another browser.');
      const types = getConfiguration().rules.images.mimeTypes;
      const type = types.includes('image/webp') ? 'image/webp' : types.includes('image/png') ? 'image/png' : 'image/jpeg';
      // Preserve transparent corners when the configured upload formats support them.
      if (type !== 'image/jpeg') {
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
        context.clip();
      }
      context.drawImage(image, (dimensions.width - side) * position.x, (dimensions.height - side) * position.y, side, side, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not prepare the image. Try again.')), type, 0.9));
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const file = new File([blob], `${source.file.name.replace(/\.[^.]+$/, '')}-cropped.${extension}`, { type: blob.type });
      const issue = await validateImage(file, kind);
      if (issue) throw new Error(issue);
      if (mounted.current) onConfirm(file);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not prepare the image. Try again.');
    } finally { if (mounted.current) setBusy(false); }
  }

  return <AppDialogContent onClick={(event) => event.stopPropagation()}>
    <AppDialogHeader title="Crop your image" description="Drag to reposition, then zoom to frame your image." leading={<Crop className="size-5 shrink-0" aria-hidden="true" />} />
    <div className="flex flex-col gap-4">
      <div
        role="group" tabIndex={0} aria-label="Image crop. Drag or use arrow keys to reposition."
        className="relative mx-auto aspect-square w-full max-w-64 touch-none cursor-grab overflow-hidden rounded-full bg-secondary outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        onKeyDown={(event) => {
          const delta = event.shiftKey ? 0.1 : 0.02;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            setPosition((current) => ({ x: clamp(current.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0)), y: clamp(current.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0)) }));
          }
        }}
        onPointerDown={(event) => {
          if (!side) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current || !side) return;
          const scale = event.currentTarget.clientWidth / side;
          const horizontal = (dimensions.width - side) * scale;
          const vertical = (dimensions.height - side) * scale;
          setPosition({ x: horizontal ? clamp(drag.current.left - (event.clientX - drag.current.x) / horizontal) : 0.5, y: vertical ? clamp(drag.current.top - (event.clientY - drag.current.y) / vertical) : 0.5 });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        <img ref={imageRef} src={source.url} alt="Circular crop preview" draggable={false}
          onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setError('Could not display this image. Choose a different file.')}
          className="pointer-events-none absolute max-w-none select-none"
          style={side ? { width: `${dimensions.width / side * 100}%`, height: `${dimensions.height / side * 100}%`, left: `${-(dimensions.width / side - 1) * position.x * 100}%`, top: `${-(dimensions.height / side - 1) * position.y * 100}%` } : { visibility: 'hidden' }} />
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        <span className="flex justify-between">Zoom <span className="font-normal tabular-nums text-muted-foreground">{zoom.toFixed(1)}×</span></span>
        <input type="range" min={1} max={maxZoom} step={0.01} value={zoom} disabled={!side || busy || maxZoom === 1} onChange={(event) => setZoom(Number(event.target.value))} className="min-h-11 w-full cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-ring" />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
    <AppDialogFooter>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => { setZoom(1); setPosition({ x: 0.5, y: 0.5 }); }}><RotateCcw data-icon="inline-start" /> Reset</Button>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="button" disabled={busy || !side} onClick={() => void confirm()}>{busy ? 'Preparing…' : 'Use image'}</Button>
    </AppDialogFooter>
  </AppDialogContent>;
}

