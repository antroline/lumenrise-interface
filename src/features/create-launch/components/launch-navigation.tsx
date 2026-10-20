import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchMethod } from '../lib/launch-draft';
import type { LaunchStageId } from '../lib/launch-stages';

export function LaunchNavigation({ step, canGoBack, method, ready, working, accountReady, hasMoreContent = false, launchAddress, onBack, onNext, onLaunch }: {
  step: LaunchStageId;
  canGoBack: boolean;
  method: LaunchMethod;
  ready: boolean;
  working: boolean;
  accountReady: boolean;
  hasMoreContent?: boolean;
  launchAddress?: string;
  onBack: () => void;
  onNext: () => void;
  onLaunch: () => void;
}) {
  const launchLabel = method !== 'bonding'
    ? 'Launch unavailable'
    : working ? 'Launching…' : accountReady ? 'Launch on Testnet' : 'Connect wallet to continue';

  return (
    <div data-launch-footer="" className="relative flex items-center gap-3 rounded-b-[15px] bg-card px-(--launch-pad) pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] sm:pt-4 sm:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]">
      <div aria-hidden="true" data-launch-fade="" className={cn('pointer-events-none absolute inset-x-0 bottom-full h-8 bg-linear-to-t from-card to-transparent transition-opacity duration-200 motion-reduce:transition-none', hasMoreContent ? 'opacity-100' : 'opacity-0')} />
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
