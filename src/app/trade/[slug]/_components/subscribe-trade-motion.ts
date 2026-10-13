import { reducedMotionQuery } from './trade-reduced-motion';
export function subscribeTradeMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
