'use client';
import { createContext, useContext } from 'react';
import type { PublicConfiguration } from './api/config';
export const ConfigurationContext = createContext<PublicConfiguration | null>(null);
export function useConfiguration() {
  const config = useContext(ConfigurationContext);
  if (!config) throw new Error('ConfigurationProvider is required.');
  return config;
}
