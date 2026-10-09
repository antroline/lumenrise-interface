import type { Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LaunchDraft } from '../../_launch/launch-draft';
import type { FieldErrors } from '../../_launch/launch-validation';

export type DraftProps = {
  draft: LaunchDraft;
  setDraft: Dispatch<SetStateAction<LaunchDraft>>;
  errors?: FieldErrors;
};

export type Preset = { label: string; value: string };

export type Choice<T extends string> = {
  value: T;
  title: string;
  detail: string;
  icon: LucideIcon;
};
