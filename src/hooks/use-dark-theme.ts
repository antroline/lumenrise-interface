'use client';

import { useSyncExternalStore } from 'react';

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}

/** Follow the app's actual theme, including its saved override of the system theme. */
export function useDarkTheme() {
  return useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);
}
