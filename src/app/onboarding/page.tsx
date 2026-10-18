'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { consumeAuthReturnTo } from '@/lib/auth-return';

/** Onboarding is paused; old links resume the saved page without showing setup. */
export default function OnboardingPage() {
  const router = useRouter();
  const redirectStarted = useRef(false);
  useEffect(() => {
    if (redirectStarted.current) return;
    redirectStarted.current = true;
    router.replace(consumeAuthReturnTo());
  }, [router]);
  return null;
}
