import { getConfiguration } from './api/config';
import { formatByteLimit } from './api/client';

export function validProjectLink(value: string, required = false): boolean {
  const rule = getConfiguration().rules.projectLinks;
  const trimmed = value.trim();
  if (!trimmed) return !required;
  if (trimmed.length > rule.maxLength) return false;
  try {
    const url = new URL(trimmed);
    return rule.protocols.includes(url.protocol) && !!url.hostname &&
      (!rule.requireDottedHostname || url.hostname.includes('.')) &&
      (rule.allowCredentials || (!url.username && !url.password));
  } catch { return false; }
}

export function validateText(value: string, min: number, max: number, label: string) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max)
    throw new Error(`${label} must contain ${min}–${max} characters.`);
  return trimmed;
}

export function imageHint(kind: 'avatar' | 'tokenImage' | 'teamImage') {
  const config = getConfiguration();
  const rule = config.rules.images;
  return `${rule.formats.join(', ').toUpperCase()}, at least ${rule.minWidth} × ${rule.minHeight} pixels, up to ${formatByteLimit(config.uploads[kind].maxBytes)}.`;
}

/** Shared preflight for all three existing image upload flows. */
export async function validateImage(file: File, kind: 'avatar' | 'tokenImage' | 'teamImage'): Promise<string | null> {
  const config = getConfiguration();
  const rule = config.rules.images;
  if (!config.features.imageUploads) return 'Image uploads are not configured right now.';
  if (!rule.mimeTypes.includes(file.type)) return `Choose ${rule.formats.join(', ').toUpperCase()} images.`;
  if (file.size > config.uploads[kind].maxBytes) return `Choose an image up to ${formatByteLimit(config.uploads[kind].maxBytes)}.`;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { return 'We could not read that image. Choose a different file.'; }
  try {
    if (bitmap.width < rule.minWidth || bitmap.height < rule.minHeight)
      return `Image must be at least ${rule.minWidth} × ${rule.minHeight} pixels.`;
    if (bitmap.width * bitmap.height > rule.maxInputPixels)
      return `Image must contain at most ${rule.maxInputPixels.toLocaleString()} pixels.`;
    return null;
  } finally { bitmap.close(); }
}
