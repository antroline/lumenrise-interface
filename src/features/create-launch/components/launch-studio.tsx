'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useLaunchpad } from '@/lib/launchpad';
import { isBondingDraft } from '../lib/bonding-curve';
import {
  BONDING_AUTH_RETURN_KEY,
  useBondingLaunch,
} from '../hooks/use-bonding-launch';
import { initialLaunchDraft } from '../lib/launch-draft';
import { launchStages, launchStageIndex, validateLaunchStage, type LaunchStageId } from '../lib/launch-stages';
import { LaunchSummary } from './launch-summary';
import { LaunchStepper } from './launch-stepper';
import { LaunchStepContent } from './launch-step-content';
import { LaunchNavigation } from './launch-navigation';
import { LaunchOperationDialog } from './launch-operation-dialog';
import {
  LaunchMotionConfig,
  LaunchStepPanel,
} from './launch-motion';

const stepDescriptions: Partial<Record<LaunchStageId, string>> = {
  project: 'Create a bonding-curve launch on Stellar Testnet.',
};

export function LaunchStudio() {
  return (
    <LaunchMotionConfig>
      <LaunchStudioContent />
    </LaunchMotionConfig>
  );
}

function LaunchStudioContent() {
  const bondingLaunch = useBondingLaunch();
  const [progressOpen, setProgressOpen] = useState(false);
  const { notify, accountReady } = useLaunchpad();
  const [draft, setDraft] = useState(initialLaunchDraft);
  const [step, setStep] = useState(0);
  const [reachedIndex, setReachedIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const studioRef = useRef<HTMLDivElement>(null);
  const [showErrors, setShowErrors] = useState(false);

  function launchBondingCurve() {
    if (bondingLaunch.operation?.status === 'success') return;
    setProgressOpen(true);
    if (!bondingLaunch.working) void bondingLaunch.launch(draft);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(BONDING_AUTH_RETURN_KEY);
        if (!stored) return;
        const restored: unknown = JSON.parse(stored);
        // Preserve auth-return drafts saved before creator fees became percentages.
        if (restored && typeof restored === 'object' && 'bonding' in restored &&
          restored.bonding && typeof restored.bonding === 'object' &&
          'creatorFee' in restored.bonding && typeof restored.bonding.creatorFee === 'boolean') {
          restored.bonding.creatorFee = restored.bonding.creatorFee ? '0.1' : '0';
        }
        const needsTokenomicsReview = !!(restored && typeof restored === 'object' && 'bonding' in restored &&
          restored.bonding && typeof restored.bonding === 'object' && !('creatorPayout' in restored.bonding));
        if (needsTokenomicsReview && restored && typeof restored === 'object' && 'bonding' in restored &&
          restored.bonding && typeof restored.bonding === 'object') {
          Object.assign(restored.bonding, { creatorPayout: '' });
        }
        if (!isBondingDraft(restored))
          throw new Error('The saved bonding-curve form cannot be read.');
        // Reputation enforcement is not connected; do not restore unsupported access rules.
        setDraft({ ...restored, eligibility: initialLaunchDraft.eligibility });
        setStep(needsTokenomicsReview ? launchStageIndex('token') : restored.quote === 'XLM' ? launchStageIndex('settings') : launchStages.length - 1);
        if (needsTokenomicsReview) notify('Launch calculations have changed. Enter your Creator Raise and review tokenomics before continuing.');
        setReachedIndex(launchStages.length - 1);
        window.sessionStorage.removeItem(BONDING_AUTH_RETURN_KEY);
      } catch (cause) {
        notify(
          cause instanceof Error
            ? cause.message
            : 'The saved bonding-curve form cannot be read.',
        );
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [notify]);

  const visibleSteps = launchStages;
  const currentStage = visibleSteps[step] ?? visibleSteps[0];
  const currentStep = currentStage.id;
  const currentIndex = step;
  const fieldErrors = showErrors ? validateLaunchStage(draft, currentStage) : {};

  function goToStep(nextStep: number) {
    setDirection(nextStep < step ? 'back' : 'forward');
    setStep(nextStep);
    setReachedIndex((current) => Math.max(current, nextStep));
    setShowErrors(false);
  }

  function next() {
    const errors = validateLaunchStage(draft, currentStage);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setShowErrors(true);
      requestAnimationFrame(() => document.getElementById(firstError)?.focus());
      return;
    }

    goToStep(step + 1);
  }

  return (
    <div
      ref={studioRef}
      data-launch-studio=""
      className="@container/studio relative mx-auto w-full min-w-0 max-w-[88rem] scroll-mt-24"
    >
      <LaunchOperationDialog
        operation={bondingLaunch.operation}
        name={draft.name}
        symbol={draft.symbol}
        logo={draft.logo}
        open={progressOpen}
        onOpenChange={setProgressOpen}
        onRetry={launchBondingCurve}
      />
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_236px] lg:@min-[900px]/studio:grid-cols-[minmax(0,1fr)_256px] lg:@min-[1000px]/studio:grid-cols-[minmax(0,1fr)_272px] lg:@min-[1200px]/studio:grid-cols-[minmax(0,1fr)_304px]">
        <LaunchSummary
          draft={draft}
          steps={visibleSteps}
          currentIndex={currentIndex}
          reachedIndex={reachedIndex}
          locked={bondingLaunch.working}
          onNavigate={goToStep}
        />
        <section
          className="@container/launch relative flex min-w-0 scroll-mt-4 flex-col rounded-2xl border border-border bg-card p-(--launch-pad) [--launch-pad:--spacing(4)] sm:[--launch-pad:--spacing(6)] xl:[--launch-pad:--spacing(8)] studio-compact:[--launch-pad:--spacing(5)]"
          aria-labelledby="wizard-title"
        >
          <LaunchStepper steps={visibleSteps} currentIndex={currentIndex} locked={bondingLaunch.working} onNavigate={goToStep} />
          <p className="sr-only" role="status" aria-live="polite">
            Step {currentIndex + 1}
            {` of ${visibleSteps.length}`}
            : {currentStage.label}
          </p>
          <AnimatePresence
            initial={false}
            mode="wait"
            custom={direction}
            onExitComplete={() => {
              // Reposition only after the outgoing step is invisible, before entry.
              const studio = studioRef.current;
              if (studio && studio.getBoundingClientRect().top < 0) {
                studio.scrollIntoView({ block: 'start', behavior: 'instant' });
              }
            }}
          >
            <LaunchStepPanel
              key={`${currentStep}-${draft.method}`}
              direction={direction}
              heading={currentStage.heading}
              description={stepDescriptions[currentStep]}
              footer={
                <LaunchNavigation
                  step={currentStep}
                  canGoBack={step > 0}
                  method={draft.method}
                  ready={bondingLaunch.isReady}
                  working={bondingLaunch.working}
                  accountReady={accountReady}
                  launchAddress={bondingLaunch.operation?.status === 'success' ? bondingLaunch.operation.curveAddress : undefined}
                  onBack={() => goToStep(step - 1)}
                  onNext={next}
                  onLaunch={launchBondingCurve}
                />
              }
            >
              <LaunchStepContent
                stage={currentStage}
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
                onEdit={(section) => goToStep(launchStageIndex(section))}
              />
            </LaunchStepPanel>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
