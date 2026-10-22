import { LogoSymbol } from '@/components/logo';
import styles from './app-loading.module.css';

export function AppLoading() {
  return (
    <main
      role="status"
      aria-label="Loading LumenRise"
      className="flex min-h-svh items-center justify-center bg-page p-6 text-foreground"
    >
      <div aria-hidden="true" className="flex flex-col items-center gap-7">
        <div className={styles.mark}>
          <LogoSymbol size={64} />
          <span className={styles.horizon} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[22px] leading-none font-semibold tracking-[-0.04em]">LumenRise</span>
          <span className="text-small text-muted-foreground">Getting things ready</span>
        </div>
      </div>
      <span className="sr-only">Loading LumenRise…</span>
    </main>
  );
}
