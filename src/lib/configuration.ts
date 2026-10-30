'use client';
import { createContext, useContext } from 'react';
import type { ApplicationConfiguration } from './api/config';
export const ConfigurationContext = createContext<ApplicationConfiguration | null>(null);
export function useConfiguration() {
  const config = useContext(ConfigurationContext);
  if (!config) throw new Error('ConfigurationProvider is required.');
  return config;
}
