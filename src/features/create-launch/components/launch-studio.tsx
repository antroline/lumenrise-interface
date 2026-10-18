'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { useLaunchpad } from '@/lib/launchpad';
import { isBondingDraft } from '../lib/bonding-curve';
import {
  BONDING_AUTH_RETURN_KEY,
  useBondingLaunch,
} from '../hooks/use-bonding-launch';
import { cn } from '@/lib/utils';
import { initialLaunchDraft } from '../lib/launch-draft';
import { launchStages, launchStageIndex, validateLaunchStage } from '../lib/launch-stages';
import { LaunchSummary } from './launch-summary';
import { LaunchStepper } from './launch-stepper';
import { LaunchStepContent } from './launch-step-content';
import { LaunchNavigation } from './launch-navigation';
import { LaunchOperationDialog } from './launch-operation-dialog';
import {
  LaunchMotionConfig,
  LaunchStepPanel,
} from './launch-motion';

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
  const [reviewLayout, setReviewLayout] = useState(false);
  const [reachedIndex, setReachedIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const studioRef = useRef<HTMLDivElement>(null);
  const [showErrors, setShowErrors] = useState(false);

  function launchBondingCurve() {
    setProgressOpen(true);
    if (!bondingLaunch.working) void bondingLaunch.launch(draft);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(BONDING_AUTH_RETURN_KEY);
        if (!stored) return;
        const restored: unknown = JSON.parse(stored);
        if (!isBondingDraft(restored))
          throw new Error('The saved bonding-curve form cannot be read.');
        // Reputation enforcement is not connected; do not restore unsupported access rules.
        setDraft({ ...restored, eligibility: initialLaunchDraft.eligibility });
        setStep(launchStages.length - 1);
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
      className="@container/studio relative mx-auto w-full min-w-0 max-w-7xl scroll-mt-24"
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
      <div
        className={cn(
          "grid min-w-0 items-stretch gap-4 @min-[800px]/studio:grid-cols-[minmax(0,1fr)_236px] @min-[900px]/studio:grid-cols-[minmax(0,1fr)_256px] @min-[1000px]/studio:grid-cols-[minmax(0,1fr)_272px] @min-[1200px]/studio:grid-cols-[minmax(0,1fr)_304px]",
          reviewLayout && "@min-[800px]/studio:justify-center @min-[800px]/studio:grid-cols-[minmax(0,max-content)_236px] @min-[900px]/studio:grid-cols-[minmax(0,max-content)_256px] @min-[1000px]/studio:grid-cols-[minmax(0,max-content)_272px] @min-[1200px]/studio:grid-cols-[minmax(0,max-content)_304px]",
        )}
      >
        <LaunchStepper draft={draft} steps={visibleSteps} currentIndex={currentIndex} reachedIndex={reachedIndex} locked={bondingLaunch.working} onNavigate={goToStep} />
        <LaunchSummary
          draft={draft}
          steps={visibleSteps}
          currentIndex={currentIndex}
          reachedIndex={reachedIndex}
          locked={bondingLaunch.working}
          onNavigate={goToStep}
        />
        <section
          className={cn(
            "@container/launch relative flex min-w-0 scroll-mt-24 flex-col rounded-2xl border border-border bg-card p-(--launch-pad) [--launch-pad:--spacing(4)] sm:[--launch-pad:--spacing(6)] lg:[--launch-pad:--spacing(5)] xl:[--launch-pad:--spacing(6)] studio-compact:[--launch-pad:--spacing(4)]",
            !reviewLayout && "lg:min-h-[min(56rem,calc(100svh-7rem))] @min-[800px]/studio:lg:min-h-[min(56rem,calc(100svh-3rem))]",
            // A size container has no intrinsic width, so Review states its own: the 700px content plus padding and border.
            reviewLayout && "@min-[800px]/studio:w-[calc(700px+2*var(--launch-pad)+2px)] @min-[800px]/studio:max-w-full",
          )}
          aria-labelledby="wizard-title"
        >
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
              // Keep the outgoing fields at their original width until hidden.
              // Commit before Motion mounts the incoming panel and before scrolling.
              flushSync(() => setReviewLayout(currentStep === 'review'));
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
              description={currentStep === 'project' ? 'Create a bonding-curve launch on Stellar Testnet.' : undefined}
              footer={
                <LaunchNavigation
                  step={currentStep}
                  canGoBack={step > 0}
                  method={draft.method}
                  ready={bondingLaunch.isReady}
                  working={bondingLaunch.working}
                  accountReady={accountReady}
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
