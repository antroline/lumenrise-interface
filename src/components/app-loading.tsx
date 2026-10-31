import { LogoSymbol } from '@/components/logo';

export function AppLoading() {
  return (
    <main
      role="status"
      aria-label="Loading LumenRise"
      className="flex min-h-svh items-center justify-center bg-page p-6 text-foreground"
    >
      <div aria-hidden="true" className="flex flex-col items-center gap-7">
        <LogoSymbol size={64} animated />
        <div className="flex flex-col items-center gap-2">
          <span className="text-[22px] leading-none font-semibold tracking-[-0.04em]">LumenRise</span>
          <span className="text-small text-muted-foreground">Getting things ready</span>
        </div>
      </div>
      <span className="sr-only">Loading LumenRise…</span>
    </main>
  );
}
