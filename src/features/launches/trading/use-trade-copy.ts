'use client';
import { useEffect, useRef, useState } from 'react';
export function useTradeCopy() {
  const [feedback, setFeedback] = useState<{
    label: string;
    message: string;
  }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      request.current += 1;
    },
    [],
  );
  const copy = async (value: string, label: string) => {
    const current = ++request.current;
    clearTimeout(timer.current);
    let message = 'Copied';
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      message = 'Could not copy. Try again.';
    }
    if (current !== request.current) return;
    setFeedback({ label, message });
    timer.current = setTimeout(() => setFeedback(undefined), 2500);
  };
  return { feedback, copy };
}
