'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const stabilityMs = 250;
const readingMs = 800;

/** Settle transient copy without slowing the operation, wallet prompts, or errors. */
export function useCompletionMessage(value: string, immediate: boolean, transitionMs: number) {
  const [message, setMessage] = useState(value);
  const [enteredVersion, setEnteredVersion] = useState(0);
  const readableUntil = useRef<number | null>(null);
  const shownIsImmediate = useRef(immediate);

  useEffect(() => {
    readableUntil.current ??= Date.now() + readingMs;
    if (value === message) return;

    const commit = () => {
      // Reserve the entrance time too; onEntered anchors this to the actual end.
      shownIsImmediate.current = immediate;
      readableUntil.current = immediate ? Date.now() : Date.now() + transitionMs + readingMs;
      setMessage(value);
    };
    if (immediate) {
      commit();
      return;
    }

    const timer = setTimeout(commit, Math.max(stabilityMs, readableUntil.current - Date.now()));
    // Cancel obsolete messages rather than queuing them behind the current one.
    return () => clearTimeout(timer);
  }, [value, immediate, message, transitionMs, enteredVersion]);

  const onEntered = useCallback(() => {
    // A finished approval/error must not linger as an actionable instruction.
    readableUntil.current = Date.now() + (shownIsImmediate.current ? 0 : readingMs);
    setEnteredVersion((version) => version + 1);
  }, []);

  return { message: immediate ? value : message, onEntered };
}
