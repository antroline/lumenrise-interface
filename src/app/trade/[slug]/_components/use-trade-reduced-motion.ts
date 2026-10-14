'use client';
import { useContext } from 'react';
import { ReducedMotion } from './trade-reduced-motion';
export function useTradeReducedMotion() {
  return useContext(ReducedMotion);
}
