import type { LaunchInput } from './launch-state';

export function isLaunchInput(value: unknown): value is LaunchInput {
  return (
    !!value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'amount' in value &&
    typeof value.amount === 'string'
  );
}

export function textField(value: LaunchInput, key: string) {
  const field = Reflect.get(value, key);
  return typeof field === 'string' ? field : '';
}
