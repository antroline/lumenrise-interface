import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchMethod } from '../lib/launch-draft';
import type { LaunchStageId } from '../lib/launch-stages';

export function LaunchNavigation({ step, canGoBack, method, ready, working, accountReady, launchAddress, onBack, onNext, onLaunch }: {
  step: LaunchStageId;
  canGoBack: boolean;
  method: LaunchMethod;
  ready: boolean;
  working: boolean;
  accountReady: boolean;
  launchAddress?: string;
  onBack: () => void;
  onNext: () => void;
  onLaunch: () => void;
}) {
  const launchLabel = method !== 'bonding'
    ? 'Launch unavailable'
    : working ? 'Launching…' : accountReady ? 'Launch on Testnet' : 'Connect wallet to continue';

  // Stays at the bottom of the viewport while a long step scrolls, so the next action is always in reach.
  return (
    <div className="sticky bottom-0 z-20 -mx-(--launch-pad) -mb-(--launch-pad) mt-8 flex shrink-0 items-center gap-3 rounded-b-[15px] border-t border-divider bg-card px-(--launch-pad) pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] sm:pt-4 sm:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))] studio-compact:mt-5">
      {canGoBack && (
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back
        </Button>
      )}
      {step === 'review' && launchAddress ? (
        <Link href={`/launch/${launchAddress}`} className={cn(buttonVariants({ size: 'lg' }), 'h-auto min-h-control-lg min-w-0 flex-1 whitespace-normal py-2 text-center sm:ml-auto sm:max-w-80')}>
          View launch <ArrowUpRight data-icon="inline-end" />
        </Link>
      ) : step === 'review' ? (
        <Button size="lg" className="h-auto min-h-control-lg min-w-0 flex-1 whitespace-normal py-2 text-center sm:ml-auto sm:max-w-80" disabled={method !== 'bonding' || !ready} onClick={onLaunch}>
          {launchLabel}
        </Button>
      ) : (
        <Button size="lg" className="min-w-0 flex-1 sm:ml-auto sm:max-w-64" onClick={onNext}>
          Continue <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}
