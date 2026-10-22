'use client';

import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import styles from './app-dialog.module.css';

/** Application modal frame, extracted from the three-signature launch dialog.
 * Keep CommandDialog on the UI primitive so global search stays independent.
 */
export function AppDialogContent({ className, overlayProps, children, animateSize = true, ...props }: ComponentProps<typeof DialogContent> & { animateSize?: boolean }) {
  const reduced = useReducedMotion();

  // The portal mounts on open; a callback ref observes each mount, including reopenings.
  const observeBody = useCallback((body: HTMLDivElement | null) => {
    const viewport = body?.parentElement;
    const popup = viewport?.parentElement;
    if (!animateSize || !body || !viewport || !popup || reduced !== false) return;

    let animation: ReturnType<typeof animate> | undefined;
    let previousHeight = popup.offsetHeight;
    // Hold the frame between measurements so new content cannot paint at its final size first.
    popup.style.height = `${previousHeight}px`;

    const resize = () => {
      // Measure the unconstrained body, not the animated frame, to avoid feedback loops.
      const style = getComputedStyle(popup);
      const naturalHeight = Math.ceil(parseFloat(getComputedStyle(body).height))
        + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const maxHeight = parseFloat(style.maxHeight);
      const nextHeight = Math.min(naturalHeight, Number.isFinite(maxHeight) ? maxHeight : Infinity);
      if (Math.abs(nextHeight - previousHeight) < 1) return;

      // Retarget an interrupted transition from its currently visible size.
      const from = parseFloat(style.height);
      animation?.stop();
      popup.style.height = `${from}px`;
      viewport.dataset.resizing = '';
      previousHeight = nextHeight;
      const current = animate(popup, { height: [from, nextHeight] }, {
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
      });
      animation = current;
      void current.then(() => {
        if (animation !== current) return;
        animation = undefined;
        popup.style.height = `${nextHeight}px`;
        delete viewport.dataset.resizing;
      });
    };

    const observer = new ResizeObserver(resize);
    observer.observe(body);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      animation?.stop();
      animation = undefined;
      delete viewport.dataset.resizing;
      popup.style.removeProperty('height');
    };
  }, [animateSize, reduced]);

  return (
    <DialogContent
      // Nested wallet approvals release focus to Blux, but must still shield the form below.
      overlayProps={{ ...overlayProps, forceRender: true, className: cn(styles.overlay, 'touch-none', overlayProps?.className) }}
      className={cn(styles.popup, 'flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-2xl p-5 sm:max-w-sm', className)}
      {...props}
    >
      <div className={cn(styles.viewport, 'min-h-0 min-w-0 overflow-x-hidden overflow-y-auto')}>
        <div ref={observeBody} className="flex min-w-0 flex-col gap-5">
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
