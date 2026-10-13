'use client';

import { useId } from 'react';
import styles from './project-detail.module.css';

export function GraduationHero({
  status,
  progress,
  amount,
  target,
  pair,
  note,
  metrics,
}: {
  status: string;
  progress: number | null;
  amount: string;
  target: string;
  pair: string;
  note: string;
  metrics: { label: string; value: string; hint: string }[];
}) {
  const clipId = useId();
  const filled = Math.max(0, Math.min(progress ?? 0, 100));
  return (
    <section className={styles.hero} aria-labelledby="graduation-heading">
      <div className={styles.heroTop}>
        <div className={styles.heroHeading}>
          <h2 id="graduation-heading">Graduation progress</h2>
          <span className={styles.heroStatus} data-status={status}>
            {status}
          </span>
        </div>
        <div className={styles.heroNumbers}>
          <p className={styles.percentage}>
            {progress === null ? '—' : progress}
            <small>{progress === null ? '' : '%'}</small>
          </p>
          <div className={styles.heroReserves}>
            <dl>
              <dt>Net quote reserves</dt>
              <dd>
                {amount} <span>{pair}</span>
              </dd>
            </dl>
            <p className={styles.heroTarget}>
              of {target} {pair} graduation target
            </p>
          </div>
        </div>
        <div
          className={styles.meter}
          role="progressbar"
          aria-label="Graduation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress === null ? undefined : filled}
          aria-valuetext={
            progress === null
              ? 'Unavailable'
              : `${progress}% of graduation target`
          }
        >
          <svg
            viewBox="0 0 1000 54"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect
                  className={styles.meterFill}
                  width="1000"
                  style={{ transform: `scaleX(${filled / 100})` }}
                  height="54"
                />
              </clipPath>
            </defs>
            {Array.from({ length: 41 }, (_, i) => (
              <line
                key={`grid-${i}`}
                x1={i * 25}
                x2={i * 25}
                y1="0"
                y2="54"
                stroke="#35413a"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 40 }, (_, i) => (
              <rect
                key={i}
                x={i * 25 + 3}
                y="12"
                width="18"
                height="30"
                fill="#46544b"
              />
            ))}
            <g clipPath={`url(#${clipId})`}>
              {Array.from({ length: 40 }, (_, i) => (
                <rect
                  key={i}
                  x={i * 25 + 3}
                  y="12"
                  width="18"
                  height="30"
                  fill="var(--color-lime)"
                />
              ))}
            </g>
            <line
              x1="999"
              x2="999"
              y1="2"
              y2="52"
              stroke="#e3ece5"
              strokeWidth="2"
            />
          </svg>
          <div className={styles.meterAxis} aria-hidden="true">
            {['0', '25', '50', '75', '100%'].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
        <p className={styles.heroNote}>{note}</p>
      </div>
      <dl className={styles.heroMetrics}>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
            <dd className={styles.metricHint}>{metric.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
