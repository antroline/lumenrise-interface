import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export function ReputationStep() {
  // TODO: Restore reputation/eligibility controls only after the verification
  // service and contract enforcement are connected. Do not collect or apply
  // reputation requirements to launches until that integration is complete.
  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <ShieldCheck className="size-9 text-muted-foreground" aria-hidden="true" />
      <Badge variant="soft">Coming soon</Badge>
      <p className="text-lg font-semibold">Reputation rules are not available yet</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Reputation verification is not connected. Your launch remains open to everyone.
        You can continue without setting any access rules.
      </p>
      <button type="button" disabled className="min-h-11 rounded-lg border border-border px-4 text-sm text-muted-foreground opacity-60">
        Configure reputation
      </button>
    </div>
  );
}
