import type { ReactNode } from 'react';

/** Shared recovery layout for unavailable and mismatched networks. */
export function NetworkNotice({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return <section className="mx-auto flex min-h-[55svh] max-w-lg flex-col items-center justify-center gap-5 px-4 py-12 text-center" aria-labelledby="network-notice-title">
    <h1 id="network-notice-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
    <p className="text-body leading-relaxed text-muted-foreground">{description}</p>
    {children}
  </section>;
}
