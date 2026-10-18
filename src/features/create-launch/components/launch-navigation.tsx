import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LaunchMethod } from '../lib/launch-draft';
import type { LaunchStageId } from '../lib/launch-stages';

export function LaunchNavigation({ step, canGoBack, method, ready, working, accountReady, onBack, onNext, onLaunch }: {
  step: LaunchStageId;
  canGoBack: boolean;
  method: LaunchMethod;
  ready: boolean;
  working: boolean;
  accountReady: boolean;
  onBack: () => void;
  onNext: () => void;
  onLaunch: () => void;
}) {
  const launchLabel = method !== 'bonding'
    ? 'Launch unavailable'
    : working ? 'Launching…' : accountReady ? 'Launch on Testnet' : 'Connect wallet to continue';

  return (
    <div className="mt-4 flex shrink-0 flex-wrap items-center gap-3 border-t border-divider pt-4 studio-compact:mt-3 studio-compact:pt-3 studio-compact:[&_button]:h-11 studio-compact:[&_button]:min-h-11">
      {canGoBack && (
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back
        </Button>
      )}
      {step === 'review' ? (
        <Button size="lg" className="h-auto min-h-control-lg min-w-0 flex-1 whitespace-normal py-2 text-center" disabled={method !== 'bonding' || !ready} onClick={onLaunch}>
          {launchLabel}
        </Button>
      ) : (
        <Button size="lg" className="min-w-0 flex-1" onClick={onNext}>
          Continue <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}
