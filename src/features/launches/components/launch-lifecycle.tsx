import { Check, Minus } from 'lucide-react';
import type { Status } from '../bonding/contract';
import styles from './project-detail.module.css';

export function LaunchLifecycle({ status }: { status: Status }) {
  const active = status === 'Scheduled' ? 0 : status === 'Graduated' ? 2 : 1;
  const steps = [
    {
      label: 'Announced',
      detail: status === 'Scheduled' ? 'Scheduled' : 'Completed',
    },
    {
      label: 'Curve Trading',
      detail:
        status === 'Open'
          ? 'Active'
          : status === 'Failed'
            ? 'Failed · sell-back only'
            : status === 'Graduated'
              ? 'Completed'
              : 'Pending',
    },
    {
      label: 'Graduation',
      detail: status === 'Graduated' ? 'Confirmed' : 'Pending',
    },
    { label: 'Post-Graduation', detail: 'Not implemented' },
  ];
  return (
    <section className={styles.lifecycle} aria-labelledby="lifecycle-heading">
      <div className={styles.lifecycleHeader}>
        <h3 id="lifecycle-heading">Launch lifecycle</h3>
        <span>Contract-driven progression</span>
      </div>
      <ol className={styles.stages} aria-label="Launch progression">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={styles.stage}
            aria-current={index === active ? 'step' : undefined}
            data-state={
              index === 3
                ? 'unimplemented'
                : index < active
                  ? 'completed'
                  : index > active
                    ? 'upcoming'
                    : status === 'Failed'
                      ? 'halted'
                      : 'active'
            }
          >
            <span className={styles.stageMarker} aria-hidden="true">
              {index < active ? (
                <Check className="size-3" />
              ) : index === 3 ? (
                <Minus className="size-3" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
