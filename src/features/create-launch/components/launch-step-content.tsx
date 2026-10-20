import type { WizardStep } from '../lib/launch-validation';
import type { LaunchStage } from '../lib/launch-stages';
import type { DraftProps } from './launch-fields/types';
import {
  EconomicsStep,
  ProjectDetailsStep,
  ReviewStep,
  SettingsStep,
  TokenSetupStep,
} from './launch-fields';
import { LaunchOutcomePreview } from './launch-fields/launch-outcome-preview';
import { TokenSupplyField } from './launch-fields/token-supply-field';
import { MethodChoice } from './method-choice';

export function LaunchStepContent({
  stage,
  onEdit,
  ...fields
}: DraftProps & {
  stage: LaunchStage;
  onEdit: (section: WizardStep) => void;
}) {
  switch (stage.id) {
    case 'project':
      return <ProjectDetailsStep {...fields} />;
    case 'token':
      return (
        <div className="flex min-w-0 flex-col gap-5">
          <MethodChoice
            selected={fields.draft.methodSelected ? fields.draft.method : null}
            onChoose={() =>
              fields.setDraft((draft) => ({
                ...draft,
                method: 'bonding',
                methodSelected: true,
              }))
            }
            error={fields.errors?.['launch-methods']}
          />
          <div className="grid min-w-0 items-start gap-5 @min-[56rem]/launch:grid-cols-[minmax(0,1fr)_minmax(16rem,0.65fr)]">
            <div className="@container/launch flex min-w-0 flex-col gap-4">
              <div className="flex min-w-0 flex-col gap-3">
                <TokenSupplyField {...fields} />
                <TokenSetupStep {...fields} />
              </div>
              <section aria-labelledby="launch-plan-title" className="flex min-w-0 flex-col gap-3 border-t border-divider pt-4">
                <h3 id="launch-plan-title" className="text-[19px] font-semibold tracking-[-0.02em]">
                  Plan your launch
                </h3>
                <div className="grid min-w-0 items-start gap-4">
                  <EconomicsStep {...fields} />
                  <SettingsStep {...fields} />
                </div>
              </section>
            </div>
            {fields.draft.method === 'bonding' && (
              <div className="min-w-0">
                <LaunchOutcomePreview draft={fields.draft} />
              </div>
            )}
          </div>
        </div>
      );
    case 'review':
      return <ReviewStep draft={fields.draft} onEdit={onEdit} />;
  }
}
