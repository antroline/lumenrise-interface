import type { LaunchDraft } from './launch-draft';
import { validateLaunchStep, type FieldErrors, type WizardStep } from './launch-validation';

export const launchStages = [
  { id: 'project', label: 'Project details', heading: 'Tell us about your token', sections: ['project'] },
  // Section order matches the on-screen order so the first invalid field receives focus.
  { id: 'token', label: 'Tokenomics & plan', heading: 'Shape your token economics', sections: ['method', 'sale', 'supply', 'allocation', 'settings'] },
  { id: 'eligibility', label: 'Participation', heading: 'Who can participate?', sections: ['eligibility'] },
  { id: 'review', label: 'Review', heading: 'Review your launch', sections: ['review'] },
] as const satisfies readonly { id: string; label: string; heading: string; sections: readonly WizardStep[] }[];

export type LaunchStage = (typeof launchStages)[number];
export type LaunchStageId = LaunchStage['id'];

export function validateLaunchStage(draft: LaunchDraft, stage: LaunchStage): FieldErrors {
  return Object.assign({}, ...stage.sections.map((section) => validateLaunchStep(draft, section)));
}

export function launchStageIndex(section: WizardStep): number {
  if (section === 'token') return launchStages.findIndex((stage) => stage.id === 'token');
  return launchStages.findIndex((stage) => stage.sections.some((item: WizardStep) => item === section));
}
