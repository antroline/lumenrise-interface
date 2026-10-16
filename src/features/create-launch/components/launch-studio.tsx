'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  // Gavel,
  // ImagePlus,
  // LineChart,
  // Tag,
  // Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLaunchpad } from '@/lib/launchpad';
import { isBondingDraft } from '../lib/bonding-curve';
import {
  BONDING_AUTH_RETURN_KEY,
  useBondingLaunch,
} from '../hooks/use-bonding-launch';
import {
  initialLaunchDraft,
  methodLabels,
  type LaunchMethod,
} from '../lib/launch-draft';
import { isLaunchInput, textField } from '../lib/launch-input';
import {
  BASIC_AUTH_RETURN_KEY,
  type LaunchInput,
} from '../lib/launch-state';
import {
  basicSteps,
  bondingSteps,
  saleSteps,
  stepLabels,
  validateLaunchStep,
  type WizardStep,
} from '../lib/launch-validation';
import { CreateLaunchEntry } from './create-launch-entry';
import {
  EconomicsStep,
  EligibilityStep,
  ParticipantVestingStep,
  ProjectDetailsStep,
  ReviewStep,
  SettingsStep,
  TokenSetupStep,
} from './launch-fields/index';
import { LaunchStepper } from './launch-stepper';
import { LaunchOperationDialog } from './launch-operation-dialog';
import {
  LaunchMotionConfig,
  LaunchReveal,
  LaunchStepPanel,
} from './launch-motion';
import { MethodChoice } from './method-choice';

const firstSteps: WizardStep[] = ['project', 'method'];

/** Subtle lime glow for the wizard's primary CTA: soft halo plus a faint
    top-light, intensifying on hover and tightening on press. */
const primaryCtaGlow = cn(
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_2px_10px_-2px_color-mix(in_srgb,var(--color-lime)_45%,transparent),0_14px_36px_-12px_color-mix(in_srgb,var(--color-lime)_40%,transparent)]',
  'transition-[box-shadow,transform,background-color] duration-200',
  'hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_16px_-4px_color-mix(in_srgb,var(--color-lime)_55%,transparent),0_18px_48px_-12px_color-mix(in_srgb,var(--color-lime)_55%,transparent)]',
  'active:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_6px_-1px_color-mix(in_srgb,var(--color-lime)_40%,transparent),0_8px_22px_-10px_color-mix(in_srgb,var(--color-lime)_35%,transparent)]',
  'disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none',
);

type LaunchStudioProps = {
  resumeIssuer: string | null;
  initialMode: 'basic' | null;
};

export function LaunchStudio(props: LaunchStudioProps) {
  return (
    <LaunchMotionConfig>
      <LaunchStudioContent {...props} />
    </LaunchMotionConfig>
  );
}

function LaunchStudioContent({ resumeIssuer, initialMode }: LaunchStudioProps) {
  const bondingLaunch = useBondingLaunch();
  const [progressOpen, setProgressOpen] = useState(false);
  const { notify } = useLaunchpad();
  const [draft, setDraft] = useState(initialLaunchDraft);
  const [step, setStep] = useState(
    resumeIssuer || initialMode === 'basic' ? 2 : 0,
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const panelRef = useRef<HTMLElement>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [basicReturnReady, setBasicReturnReady] = useState(
    initialMode !== 'basic',
  );
  const [restoredProjectName, setRestoredProjectName] = useState(false);

  function launchBondingCurve() {
    setProgressOpen(true);
    if (!bondingLaunch.working) void bondingLaunch.launch(draft);
  }

  useEffect(() => {
    if (resumeIssuer || initialMode === 'basic') return;
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(BONDING_AUTH_RETURN_KEY);
        if (!stored) return;
        const restored: unknown = JSON.parse(stored);
        if (!isBondingDraft(restored))
          throw new Error('The saved bonding-curve form cannot be read.');
        setDraft(restored);
        setStep(bondingSteps.length - 1);
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
  }, [resumeIssuer, initialMode, notify]);

  useEffect(() => {
    if (initialMode !== 'basic') return;
    const timeout = window.setTimeout(() => {
      let restoredInput: LaunchInput | null = null;
      try {
        const stored = window.sessionStorage.getItem(BASIC_AUTH_RETURN_KEY);
        window.sessionStorage.removeItem(BASIC_AUTH_RETURN_KEY);
        if (stored) {
          const input: unknown = JSON.parse(stored);
          if (isLaunchInput(input)) restoredInput = input;
        }
      } catch {
        /* Continue with the empty Basic form if session storage is unavailable. */
      }
      if (restoredInput)
        setDraft((current) => ({
          ...current,
          name: restoredInput.name,
          symbol: restoredInput.code,
          supply: restoredInput.amount,
          logo: textField(restoredInput, 'logo'),
          description: textField(restoredInput, 'description'),
          xAccount: textField(restoredInput, 'xAccount'),
          website: textField(restoredInput, 'website'),
          method: 'basic',
          methodSelected: true,
        }));
      setRestoredProjectName(!!restoredInput?.name);
      setBasicReturnReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialMode]);
  // const activeMethod =
  //   resumeIssuer || initialMode === 'basic' ? 'basic' : draft.method;
  const visibleSteps: WizardStep[] = resumeIssuer
    ? ['basic']
    : initialMode === 'basic'
      ? basicSteps
      : draft.methodSelected
        ? draft.method === 'basic'
          ? basicSteps
          : draft.method === 'bonding'
            ? bondingSteps
            : saleSteps
        : firstSteps;
  const currentStep = resumeIssuer
    ? 'basic'
    : (visibleSteps[step] ?? 'project');
  const currentIndex = resumeIssuer ? 0 : step;
  const fieldErrors = showErrors ? validateLaunchStep(draft, currentStep) : {};
  // const MethodIcon =
  //   activeMethod === 'bonding'
  //     ? LineChart
  //     : activeMethod === 'fixed'
  //       ? Tag
  //       : activeMethod === 'auction'
  //         ? Gavel
  //         : Wallet;

  function goToStep(nextStep: number) {
    setDirection(nextStep < step ? 'back' : 'forward');
    setStep(nextStep);
    setShowErrors(false);
  }

  function choose(method: LaunchMethod) {
    setDraft((current) => ({ ...current, method, methodSelected: true }));
    goToStep(2);
  }

  function next() {
    const errors = validateLaunchStep(draft, currentStep);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setShowErrors(true);
      requestAnimationFrame(() => document.getElementById(firstError)?.focus());
      return;
    }

    goToStep(step + 1);
  }

  const heading: Record<WizardStep, string> = {
    project: 'Tell us about your token',
    method: 'How will you launch your token?',
    token: 'Set supply and allocation',
    sale: `Configure ${methodLabels[draft.method].toLowerCase()}`,
    settings: 'Launch settings',
    eligibility: 'Who can participate?',
    vesting: 'When do participants receive tokens?',
    review: `Review ${methodLabels[draft.method].toLowerCase()}`,
    basic: resumeIssuer ? 'Continue token creation' : 'Create your token',
  };

  return (
    <div
      data-launch-studio=""
      className="relative grid w-full min-w-0 items-start gap-5 lg:grid-cols-[max-content_minmax(0,1fr)] xl:gap-6"
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
      <aside className="hidden lg:sticky lg:top-24 lg:block">
        <LaunchStepper
          steps={visibleSteps}
          currentIndex={currentIndex}
          onNavigate={(index) => goToStep(index)}
          locked={!!resumeIssuer}
          method={draft.method}
        />
      </aside>

      <section
        ref={panelRef}
        className="@container/launch relative flex min-h-120 min-w-0 scroll-mt-24 flex-col rounded-[28px] border border-border bg-card p-5 sm:p-6 xl:p-7 short:min-h-100 short:sm:p-4 short:xl:p-4"
        aria-labelledby="wizard-title"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-4 lg:hidden short:mb-4 short:pb-3">
          <span className="text-ui font-semibold" aria-hidden="true">
            Step {currentIndex + 1}
            {draft.methodSelected || initialMode === 'basic' || resumeIssuer
              ? ` of ${visibleSteps.length}`
              : ''}{' '}
            · {stepLabels[currentStep]}
          </span>
          <span className="flex gap-1.5" aria-hidden="true">
            {visibleSteps.map((item, index) => (
              <span
                key={item}
                className={cn(
                  'h-1.5 w-5 rounded-full transition-colors duration-200',
                  index <= currentIndex ? 'bg-emphasis' : 'bg-border',
                )}
              />
            ))}
          </span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          Step {currentIndex + 1}
          {draft.methodSelected || initialMode === 'basic' || resumeIssuer
            ? ` of ${visibleSteps.length}`
            : ''}
          : {stepLabels[currentStep]}
        </p>
        <AnimatePresence
          initial={false}
          mode="wait"
          custom={direction}
          onExitComplete={() => {
            // Reposition only after the outgoing step is invisible, before entry.
            const panel = panelRef.current;
            if (panel && panel.getBoundingClientRect().top < 0) {
              panel.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
          }}
        >
          <LaunchStepPanel
            key={`${currentStep}-${draft.method}`}
            direction={direction}
            heading={heading[currentStep]}
            description={
              currentStep === 'method'
                ? 'Basic creates a token on testnet. The sale methods are setup previews until their contracts are connected.'
                : currentStep === 'basic'
                  ? 'This is the live Stellar testnet token flow. Review the warning before connecting or signing.'
                  : currentStep === 'settings'
                    ? 'Choose when your token launch starts and ends.'
                    : undefined
            }
            footer={
              <div
                className={cn(
                  'flex shrink-0 flex-wrap gap-3 border-t border-divider pt-5 short:pt-4',
                  currentStep === 'vesting' ? 'mt-auto' : 'mt-5',
                )}
              >
                {!resumeIssuer && step > 0 && (
                  <Button
                    className="h-14 rounded-2xl px-5"
                    variant="outline"
                    onClick={() => goToStep(step - 1)}
                  >
                    <ArrowLeft data-icon="inline-start" />
                    Back
                  </Button>
                )}
                {currentStep !== 'method' &&
                  currentStep !== 'basic' &&
                  currentStep !== 'review' && (
                    <Button
                      className={cn(
                        'h-14 min-w-0 flex-1 rounded-2xl text-base border-2 border-surface',
                      )}
                      onClick={next}
                    >
                      Continue
                      <ArrowRight
                        data-icon="inline-end"
                        className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </Button>
                  )}
                {currentStep === 'review' && (
                  <Button
                    className={cn(
                      'h-14 min-w-0 flex-1 rounded-2xl text-base',
                      primaryCtaGlow,
                    )}
                    disabled={
                      draft.method !== 'bonding' || !bondingLaunch.isReady
                    }
                    onClick={launchBondingCurve}
                  >
                    {draft.method !== 'bonding'
                      ? 'Launch unavailable'
                      : bondingLaunch.working
                        ? 'Launching…'
                        : 'Launch'}
                  </Button>
                )}
                {currentStep === 'method' && (
                  <p className="self-center text-small text-muted-foreground">
                    Select a method to see its setup steps.
                  </p>
                )}
              </div>
            }
          >
            {currentStep === 'project' && (
              <ProjectDetailsStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'method' && (
              <MethodChoice
                onChoose={choose}
                selected={draft.methodSelected ? draft.method : null}
              />
            )}
            {currentStep === 'token' && (
              <TokenSetupStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'sale' && (
              <EconomicsStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'settings' && (
              <SettingsStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'eligibility' && (
              <EligibilityStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'vesting' && (
              <ParticipantVestingStep
                draft={draft}
                setDraft={setDraft}
                errors={fieldErrors}
              />
            )}
            {currentStep === 'review' && (
              <ReviewStep draft={draft} onEdit={(index) => goToStep(index)} />
            )}
            {currentStep === 'basic' && (
              <>
                {!resumeIssuer && (
                  <div className="mb-6 flex items-center gap-4 rounded-xl bg-surface p-4">
                    {draft.logo && (
                      <img
                        src={draft.logo}
                        alt=""
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-ui font-semibold">
                        {draft.name || 'Your token'}
                      </p>
                      <p className="text-small text-muted-foreground">
                        Basic token creation uses the name, symbol and supply.
                        The image and description are not included in the token
                        transaction.
                      </p>
                    </div>
                  </div>
                )}
                <LaunchReveal show={basicReturnReady}>
                  <CreateLaunchEntry
                    initialResumeIssuer={resumeIssuer}
                    initialInput={{
                      name: draft.name,
                      code: draft.symbol,
                      amount: draft.supply,
                    }}
                    hideIdentity={
                      !resumeIssuer &&
                      (initialMode !== 'basic' || restoredProjectName)
                    }
                    onInputChange={(input) =>
                      setDraft((current) => ({
                        ...current,
                        name: input.name,
                        symbol: input.code,
                        supply: input.amount,
                      }))
                    }
                    onBeforeConnect={(input) => {
                      try {
                        window.sessionStorage.setItem(
                          BASIC_AUTH_RETURN_KEY,
                          JSON.stringify(input),
                        );
                        window.sessionStorage.setItem(
                          BASIC_AUTH_RETURN_KEY,
                          JSON.stringify({
                            ...input,
                            logo: draft.logo,
                            description: draft.description,
                            xAccount: draft.xAccount,
                            website: draft.website,
                          }),
                        );
                      } catch {
                        /* Keep the token fields if the project image exceeds session storage capacity. */
                      }
                    }}
                  />
                </LaunchReveal>
              </>
            )}
          </LaunchStepPanel>
        </AnimatePresence>
      </section>
      {/* <aside
        className="hidden min-w-0 xl:sticky xl:top-24 xl:block"
        aria-label="Your launch summary"
      >
        <div className="rounded-[28px] border border-border bg-card p-4 xl:p-5">
          <h3 className="text-[16px] font-semibold tracking-[-0.02em]">
            Your launch
          </h3>
          <div className="mt-5">
            {draft.logo ? (
              <img
                src={draft.logo}
                alt=""
                className="size-14 rounded-xl object-cover"
              />
            ) : (
              <span
                className="grid size-14 place-items-center rounded-xl bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <ImagePlus className="size-5" />
              </span>
            )}
            <p className="mt-3 break-words text-[17px] font-semibold leading-snug tracking-[-0.02em]">
              {draft.name || 'Untitled project'}
            </p>
            <LaunchReveal show={!!draft.symbol}>
              <p className="mt-0.5 break-all text-small font-medium text-muted-foreground">
                ${draft.symbol}
              </p>
            </LaunchReveal>
          </div>
          <div className="mt-5 border-t border-divider pt-4">
            <p className="text-[12px] font-medium text-muted-foreground">
              Launch method
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              {draft.methodSelected ||
              initialMode === 'basic' ||
              resumeIssuer ? (
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                  <MethodIcon className="size-4" aria-hidden="true" />
                </span>
              ) : null}
              <p className="min-w-0 break-words text-small font-semibold text-foreground">
                {draft.methodSelected || initialMode === 'basic' || resumeIssuer
                  ? methodLabels[activeMethod]
                  : 'Not selected'}
              </p>
            </div>
          </div>
        </div>
      </aside> */}
    </div>
  );
}
