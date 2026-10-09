'use client';

import { Switch } from '@/components/ui/switch';

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-divider pt-5 pr-3 short:pt-4">
      <div className="min-w-0 flex-1">
        <p className="text-ui font-semibold">{label}</p>
        <p className="mt-1 max-w-[62ch] text-small text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
