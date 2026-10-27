'use client';

import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import styles from './app-dialog.module.css';

/** Shared frame for application dialogs, including global search. */
export function AppDialogContent({ className, overlayProps, children, animateSize = true, ...props }: ComponentProps<typeof DialogContent> & { animateSize?: boolean }) {
  const reduced = useReducedMotion();

  // The portal mounts on open; a callback ref observes each mount, including reopenings.
  const observeBody = useCallback((body: HTMLDivElement | null) => {
    const viewport = body?.parentElement;
    const popup = viewport?.parentElement;
    if (!animateSize || !body || !viewport || !popup || reduced !== false) return;

    let animation: Animation | undefined;
    let previousHeight = parseFloat(getComputedStyle(popup).height);
    popup.style.height = `${previousHeight}px`;

    const resize = () => {
      if (popup.hasAttribute('data-closed')) return;
      // The non-shrinking body stays independent of the animated, scrollable frame.
      const style = getComputedStyle(popup);
      const naturalHeight = parseFloat(getComputedStyle(body).height)
        + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const maxHeight = parseFloat(style.maxHeight);
      const nextHeight = Math.min(naturalHeight, Number.isFinite(maxHeight) ? maxHeight : Infinity);
      if (Math.abs(nextHeight - previousHeight) < 1) return;

      // Retarget an interrupted transition from its currently visible size.
      const from = parseFloat(style.height);
      animation?.cancel();
      animation = undefined;
      previousHeight = nextHeight;
      popup.style.height = `${nextHeight}px`;
      delete viewport.dataset.resizing;
      // Mount and reduced-motion fallback must never animate from an empty frame.
      if (popup.hasAttribute('data-starting-style') || typeof popup.animate !== 'function') return;

      // Suppress only transient overflow. Genuinely long content remains scrollable.
      if (naturalHeight <= nextHeight + 1) viewport.dataset.resizing = '';
      const current = popup.animate({ height: [`${from}px`, `${nextHeight}px`] }, {
        duration: 200,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
      animation = current;
      const complete = () => {
        if (animation !== current) return;
        animation = undefined;
        delete viewport.dataset.resizing;
      };
      // Native cancellation settles too, so an interrupted resize cannot strand the scroll lock.
      void current.finished.then(complete, complete);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(body);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      animation?.cancel();
      animation = undefined;
      delete viewport.dataset.resizing;
      popup.style.removeProperty('height');
    };
  }, [animateSize, reduced]);

  return (
    <DialogContent
      // Nested wallet approvals release focus to Blux, but must still shield the form below.
      overlayProps={{ ...overlayProps, forceRender: true, className: cn(styles.overlay, 'touch-none', overlayProps?.className) }}
      data-presentation="responsive"
      className={cn(styles.popup, 'flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-2xl p-5 sm:max-w-sm', className)}
      {...props}
    >
      <div data-slot="dialog-viewport" className={cn(styles.viewport, 'min-h-0 min-w-0 overflow-x-hidden overflow-y-auto')}>
        <div ref={observeBody} className="flex min-w-0 shrink-0 flex-col gap-5">
          {children}
        </div>
      </div>
    </DialogContent>
  );
}

export function AppDialogHeader({ title, description, leading, descriptionTitle, truncateDescription = false }: {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  descriptionTitle?: string;
  truncateDescription?: boolean;
}) {
  return (
    <DialogHeader className="flex-row items-center gap-3 pr-6">
      {leading}
      <div className="min-w-0">
        <DialogTitle className="text-lg leading-tight tracking-tight">{title}</DialogTitle>
        {description && <DialogDescription className={cn('mt-1', truncateDescription && 'truncate')} title={descriptionTitle}>
          {description}
        </DialogDescription>}
      </div>
    </DialogHeader>
  );
}

export function AppDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn(styles.footer, 'flex flex-wrap items-center justify-end gap-2', className)} {...props} />;
}
