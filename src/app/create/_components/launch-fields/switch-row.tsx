'use client';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export function SwitchRow({
  label,
  description,
  badge,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  badge?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-divider pt-5 short:pt-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-semibold">{label}</p>
          {badge && <Badge variant="soft">{badge}</Badge>}
        </div>
        <p className="mt-1.5 max-w-[62ch] text-body text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        className="mt-1"
        aria-label={label}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
