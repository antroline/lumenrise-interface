import type { Metadata } from 'next';
import { FeaturedLaunch } from './_home/featured-launch';
import { LaunchBrowser } from './_home/launch-browser';
import { QuickActions } from './_home/quick-actions';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1320px] flex-col gap-8">
      <FeaturedLaunch />
      <LaunchBrowser />
      <QuickActions />
    </div>
  );
}
