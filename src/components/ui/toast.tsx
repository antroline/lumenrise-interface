'use client';

import { useCallback, type ReactNode } from 'react';
import { Toast } from '@base-ui/react/toast';
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationOptions, type NotificationOptions } from '@/lib/notifications';

const tones = {
  info: { label: 'Notice', icon: Info, className: 'text-info' },
  success: { label: 'Success', icon: CheckCircle2, className: 'text-ok' },
  warning: { label: 'Warning', icon: TriangleAlert, className: 'text-warn' },
  error: { label: 'Error', icon: CircleAlert, className: 'text-bad' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider limit={3}>
      {children}
      <ToastList />
    </Toast.Provider>
  );
}

export function useNotify() {
  const { add } = Toast.useToastManager<Record<string, never>>();
  return useCallback((message: string, options?: NotificationOptions) => {
    add(notificationOptions(message, options));
  }, [add]);
}

function ToastList() {
  const { toasts } = Toast.useToastManager<Record<string, never>>();
  return (
    <Toast.Portal>
      <Toast.Viewport
        aria-label="Notifications"
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-h-[calc(100svh-2rem)] max-w-sm flex-col gap-3 overflow-y-auto overscroll-contain p-1"
      >
        {toasts.map((toast) => {
          const tone = tones[toast.type as keyof typeof tones] ?? tones.info;
          const Icon = tone.icon;
          return (
            <Toast.Root
              key={toast.id}
              data-slot="toast"
              toast={toast}
              swipeDirection={[]}
              className="relative w-full shrink-0 rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-border transition-opacity duration-150 data-ending-style:opacity-0 data-limited:hidden data-starting-style:opacity-0 motion-reduce:transition-none"
            >
              <Toast.Content className="flex items-start gap-3 p-3">
                <Icon aria-hidden="true" className={cn('mt-1 size-4 shrink-0', tone.className)} />
                <div className="min-w-0 flex-1 py-0.5">
                  <span className={cn('text-caption font-semibold', tone.className)}>{tone.label}</span>
                  <Toast.Title className="mt-0.5 text-sm leading-relaxed [overflow-wrap:anywhere]" />
                </div>
                <Toast.Close
                  aria-label="Dismiss message"
                  render={<Button variant="ghost" size="icon" className="size-11" />}
                >
                  <X aria-hidden="true" />
                </Toast.Close>
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
