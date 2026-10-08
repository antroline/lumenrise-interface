'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Gavel,
  ImagePlus,
  LineChart,
  Tag,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  initialLaunchDraft,
  methodLabels,
  type LaunchMethod,
} from '../_launch/launch-draft';
import { isLaunchInput, textField } from '../_launch/launch-input';
import {
  BASIC_AUTH_RETURN_KEY,
  type LaunchInput,
} from '../_launch/launch-state';
import {
  basicSteps,
  bondingSteps,
  saleSteps,
  stepLabels,
  validateLaunchStep,
  type WizardStep,
} from '../_launch/launch-validation';
import { CreateLaunchEntry } from './create-launch-entry';
import {
  EconomicsStep,
  EligibilityStep,
  ParticipantVestingStep,
  ProjectDetailsStep,
  ReviewStep,
  SettingsStep,
  TokenSetupStep,
} from './launch-fields';
import { LaunchStepper } from './launch-stepper';
import {
  LaunchMotionConfig,
  LaunchReveal,
  LaunchStepPanel,
} from './launch-motion';
import { MethodChoice } from './method-choice';

const firstSteps: WizardStep[] = ['project', 'method'];

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
  const [draft, setDraft] = useState(initialLaunchDraft);
  const [step, setStep] = useState(
    resumeIssuer || initialMode === 'basic' ? 2 : 0,
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [showErrors, setShowErrors] = useState(false);
  const [basicReturnReady, setBasicReturnReady] = useState(
    initialMode !== 'basic',
  );
  const [restoredProjectName, setRestoredProjectName] = useState(false);

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
  const activeMethod =
    resumeIssuer || initialMode === 'basic' ? 'basic' : draft.method;
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
  const MethodIcon =
    activeMethod === 'bonding'
      ? LineChart
      : activeMethod === 'fixed'
        ? Tag
        : activeMethod === 'auction'
          ? Gavel
          : Wallet;

  function goToStep(nextStep: number) {
    setDirection(nextStep < step ? 'back' : 'forward');
    setStep(nextStep);
    setShowErrors(false);
    requestAnimationFrame(() =>
      document.getElementById('wizard-title')?.focus({ preventScroll: true }),
    );
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
    settings:
      draft.method === 'bonding'
        ? 'Schedule the bonding curve'
        : draft.method === 'auction'
          ? 'Schedule the auction'
          : 'Schedule the sale',
    eligibility: 'Who can participate?',
    vesting: 'When do participants receive tokens?',
    review: `Review ${methodLabels[draft.method].toLowerCase()}`,
    basic: resumeIssuer ? 'Continue token creation' : 'Create your token',
  };

  return (
    <div
      data-launch-studio=""
      className="relative grid w-full min-w-0 items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px] xl:gap-6"
    >
      <aside className="hidden lg:sticky lg:top-24 lg:-ml-8 lg:block">
        <LaunchStepper
          steps={visibleSteps}
          currentIndex={currentIndex}
          onNavigate={(index) => goToStep(index)}
          locked={!!resumeIssuer}
          method={draft.method}
        />
      </aside>

      <section
        className="relative flex min-h-120 min-w-0 flex-col rounded-[28px] border border-border bg-card p-5 sm:p-6 xl:p-8"
        aria-labelledby="wizard-title"
      >
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-5 lg:hidden">
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
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <LaunchStepPanel
            key={`${currentStep}-${draft.method}`}
            direction={direction}
            heading={heading[currentStep]}
            description={
              currentStep === 'method'
                ? 'Basic creates a token on testnet. The sale methods are setup previews until their contracts are connected.'
                : currentStep === 'basic'
                  ? 'This is the live Stellar testnet token flow. Review the warning before connecting or signing.'
                  : undefined
            }
            footer={
              <div
                className={cn(
                  'flex shrink-0 flex-wrap gap-3 border-t border-divider pt-5',
                  currentStep === 'vesting' ? 'mt-auto' : 'mt-5',
                )}
              >
                {!resumeIssuer && step > 0 && (
                  <Button
                    className="h-12 rounded-2xl"
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
                      className="h-12 min-w-0 flex-1 rounded-2xl"
                      onClick={next}
                    >
                      Continue
                    </Button>
                  )}
                {currentStep === 'review' && (
                  <Button className="h-12 min-w-0 flex-1 rounded-2xl" disabled>
                    Launch unavailable
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
      <aside
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
      </aside>
    </div>
  );
}
