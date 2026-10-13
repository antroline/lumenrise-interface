'use client';
import { createContext } from 'react';
export const TabState = createContext({
  active: 'buy',
  indicator: '',
  line: false,
});
