'use client';

import { useState } from 'react';
import { Blockie } from './blockie';

/** Keep the public metadata URL verbatim; failed URLs are never retried in a loop. */
export function TokenLogo({
  logo,
  name,
  seed,
  size = 40,
}: {
  logo?: string;
  name: string;
  seed: string;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!logo || !/^https?:\/\//i.test(logo) || failedUrl === logo)
    return <Blockie seed={seed} size={size} radius={Math.round(size * 0.28)} />;
  // Uploaded metadata images have arbitrary hosts and must not use the private image API.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={logo}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(logo)}
      className="shrink-0 rounded-xl object-cover"
      style={{ width: size, height: size }}
    />
  );
}
