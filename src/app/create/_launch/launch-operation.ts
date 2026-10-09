export type LaunchOperationStep = 'check' | 'setup' | 'issue' | 'deploy' | 'curve';

export type LaunchOperation = {
  step: LaunchOperationStep;
  status: 'running' | 'success' | 'error';
  phase: 'working' | 'approval' | 'confirming';
  message: string;
  hash?: string;
  curveAddress?: string;
};
