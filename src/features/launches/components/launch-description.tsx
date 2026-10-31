'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LaunchDescription({ description }: { description: string }) {
  const id = useId();
  const content = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    let mounted = true;
    const measure = () => {
      if (!mounted) return;
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setCanExpand(element.scrollHeight > lineHeight * 6 + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts.ready.then(measure);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [description]);

  return (
    <div className="flex min-w-0 max-w-3xl flex-col items-start">
      <p
        id={id}
        ref={content}
        className={cn(
          'w-full whitespace-pre-wrap text-base leading-7 text-muted-foreground [overflow-wrap:anywhere] dark:text-muted-foreground',
          !expanded && 'line-clamp-6',
        )}
      >
        {description}
      </p>
      {canExpand && (
        <Button
          variant="link"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(current => !current)}
          className="mt-3 font-medium text-foreground underline-offset-4 focus-visible:ring-ring dark:text-foreground"
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </div>
  );
}
