export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export type NotificationOptions = {
  tone?: NotificationTone;
};

export function notificationOptions(message: string, options: NotificationOptions = {}) {
  const tone = options.tone ?? 'info';
  const persistent = tone === 'error' || tone === 'warning';
  return {
    title: message,
    type: tone,
    priority: tone === 'error' ? 'high' as const : 'low' as const,
    // Errors need a deliberate dismissal; longer notices need more reading time.
    timeout: persistent ? 0 : Math.min(30000, Math.max(5000, message.length * 60)),
  };
}
