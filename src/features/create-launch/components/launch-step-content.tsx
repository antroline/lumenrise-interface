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
      // Fields on the left and their calculated outcome on the right; on narrow cards the preview
      // follows the economics it reflects, before the plan. Each column redeclares the `launch`
      // container so field grids respond to the column width.
      return (
        <div className="grid min-w-0 gap-x-10 gap-y-8 @min-[800px]/launch:grid-cols-[minmax(0,1fr)_19rem] @min-[960px]/launch:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="@container/launch flex min-w-0 flex-col gap-6 studio-compact:gap-5">
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
            <TokenSupplyField {...fields} />
            <TokenSetupStep {...fields} />
          </div>
          {fields.draft.method === 'bonding' && (
            <div className="min-w-0 @min-[800px]/launch:sticky @min-[800px]/launch:top-4 @min-[800px]/launch:col-start-2 @min-[800px]/launch:row-span-2 @min-[800px]/launch:row-start-1 @min-[800px]/launch:self-start">
              <LaunchOutcomePreview draft={fields.draft} />
            </div>
          )}
          <section
            aria-labelledby="launch-plan-title"
            className="@container/launch flex min-w-0 flex-col gap-5 border-t border-divider pt-8 studio-compact:pt-6"
          >
            <h3 id="launch-plan-title" className="text-[19px] font-semibold tracking-[-0.02em]">
              Plan your launch
            </h3>
            <EconomicsStep {...fields} />
            <SettingsStep {...fields} />
          </section>
        </div>
      );
    case 'review':
      return <ReviewStep draft={fields.draft} onEdit={onEdit} />;
  }
}
