import type { WizardStep } from '../lib/launch-validation';
import type { LaunchStage } from '../lib/launch-stages';
import type { DraftProps } from './launch-fields/types';
import {
  EconomicsStep, ProjectDetailsStep, ReviewStep, SettingsStep, TokenSetupStep,
} from './launch-fields';
import { TokenSupplyField } from './launch-fields/token-supply-field';
import { MethodChoice } from './method-choice';

export function LaunchStepContent({ stage, onEdit, ...fields }: DraftProps & {
  stage: LaunchStage;
  onEdit: (section: WizardStep) => void;
}) {
  switch (stage.id) {
    case 'project': return <ProjectDetailsStep {...fields} />;
    case 'token': return (
      <div className="flex min-w-0 flex-col gap-4 studio-compact:gap-3 studio-compact:[&_[data-slot=field-group]]:gap-2 studio-compact:[&_[data-slot=field-set]]:gap-2">
        <MethodChoice selected={fields.draft.methodSelected ? fields.draft.method : null}
          onChoose={() => fields.setDraft((draft) => ({ ...draft, method: 'bonding', methodSelected: true }))}
          error={fields.errors?.['launch-methods']} />
        <TokenSupplyField {...fields} />
        <TokenSetupStep {...fields} />
      </div>
    );
    case 'settings': return (
      <div className="flex min-w-0 flex-col gap-5 studio-compact:gap-3">
        <EconomicsStep {...fields} />
        <SettingsStep {...fields} />
      </div>
    );
    case 'review': return <ReviewStep draft={fields.draft} onEdit={onEdit} />;
  }
}
