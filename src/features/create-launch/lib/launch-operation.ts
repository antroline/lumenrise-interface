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
  status: 'running' | 'success' | 'error';
  phase: 'working' | 'approval' | 'confirming';
  message: string;
  hash?: string;
  transactionHashes?: Partial<Record<LaunchOperationStep, string>>;
  curveAddress?: string;
  slug?: string;
};
