/**
 * Client-side checks for profile photos, mirroring the server rules. The
 * server stays authoritative; a 413 response carries the configured byte
 * limit in `result.maxBytes`.
 */

export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROFILE_IMAGE_MIN_DIMENSION = 128;
/** Default server limit (5 MiB); the server may be configured differently. */
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolvePromise, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolvePromise({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unreadable image file'));
    };
    image.src = url;
  });
}

/** Returns an error message when the file cannot be used, otherwise null. */
export async function validateProfileImage(file: File): Promise<string | null> {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    return 'Choose a PNG, JPG or WebP image.';
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return 'Choose an image under 5 MB.';
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (
      width < PROFILE_IMAGE_MIN_DIMENSION ||
      height < PROFILE_IMAGE_MIN_DIMENSION
    ) {
      return `Image must be at least ${PROFILE_IMAGE_MIN_DIMENSION}×${PROFILE_IMAGE_MIN_DIMENSION} pixels.`;
    }
  } catch {
    return 'We could not read that image. Choose a different file.';
  }
  return null;
}
