import type { QueuedTrade } from '@/lib/api/launches/trade-queue';

export type LaunchOperationStep =
  | 'check'
  | 'logo'
  | 'setup'
  | 'issue'
  | 'deploy'
  | 'curve'
  | 'index';

export type LaunchOperation = {
  step: LaunchOperationStep;
  status: 'running' | 'success' | 'error' | 'pending';
  phase: 'working' | 'approval' | 'confirming';
  message: string;
  hash?: string;
  transactionHashes?: Partial<Record<LaunchOperationStep, string>>;
  curveAddress?: string;
  slug?: string;
  registration?: QueuedTrade;
  recoveryKey?: string;
};

export class LaunchRegistrationPendingError extends Error {
  constructor() {
    super('Your launch is confirmed on the network. Please wait while we finish preparing your project page. This may take a few minutes.');
  }
}
