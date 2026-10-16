'use client';

import { ArrowUpRight, Coins, Sunrise, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LaunchDisplayAmount } from './launch-display-amount';
import styles from './project-detail.module.css';

export function LaunchOverviewCards({
  status,
  progress,
  amount,
  target,
  pair,
  note,
  metrics,
  remaining,
}: {
  status: string;
  progress: number | null;
  amount: string;
  target: string;
  pair: string;
  note: string;
  remaining: string;
  metrics: { label: string; value: string; hint: string }[];
}) {
  const filled = Math.max(0, Math.min(progress ?? 0, 100));
  return (
    <section className={styles.overviewCards} aria-labelledby="overview-title">
      <div className={styles.overviewTitle}>
        <div>
          <h2 id="overview-title">Launch overview</h2>
          <p>The numbers, the terms, and what comes next.</p>
        </div>
        <Badge variant="soft">{status}</Badge>
      </div>
      <dl className={styles.marketCards}>
        {metrics.slice(0, 2).map((metric, index) => {
          const Icon = index === 0 ? TrendingUp : Coins;
          return (
            <div key={metric.label} className={styles.marketCard}>
              <dt>
                <span className={styles.metricIcon}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                {metric.label}
              </dt>
              <dd className={styles.marketValue}>
                <LaunchDisplayAmount value={metric.value} />
              </dd>
              <dd className={styles.marketHint}>{metric.hint}</dd>
            </div>
          );
        })}
      </dl>
      <section
        className={styles.fundingCard}
        aria-labelledby="graduation-heading"
      >
        <div className={styles.fundingHeading}>
          <span className={styles.riseMark} aria-hidden="true">
            <Sunrise size={24} strokeWidth={1.5} />
          </span>
          <div>
            <h3 id="graduation-heading">The road to graduation</h3>
            <p>Net reserves toward the launch target</p>
          </div>
          <span className={styles.fundingPercent}>
            {progress === null ? '—' : progress + '%'}
          </span>
        </div>
        <div className={styles.fundingAmounts}>
          <p>
            <strong>
              <LaunchDisplayAmount value={amount} />
            </strong>{' '}
            <span>{pair} reserved</span>
          </p>
          <p>
            <span>Target</span>{' '}
            <strong>
              <LaunchDisplayAmount value={target} />
            </strong>{' '}
            <span>{pair}</span>
          </p>
        </div>
        <div
          className={styles.fundingTrack}
          role="progressbar"
          aria-label="Graduation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress === null ? undefined : filled}
          aria-valuetext={
            progress === null
              ? 'Unavailable'
              : progress + '% of graduation target'
          }
        >
          <div className={styles.fundingFill} style={{ width: filled + '%' }} />
        </div>
        <div className={styles.fundingFoot}>
          <p>
            {remaining === 'Unavailable' ? (
              'Remaining target unavailable'
            ) : (
              <>
                <LaunchDisplayAmount value={remaining} /> {pair} to target
              </>
            )}
          </p>
          <ArrowUpRight size={17} aria-hidden="true" />
        </div>
        <p className={styles.sourceNote}>{note}</p>
      </section>
      <section className={styles.termsCard} aria-labelledby="terms-heading">
        <h3 id="terms-heading" tabIndex={-1}>
          Launch terms
        </h3>
        <dl className={styles.termsGrid}>
          {metrics.slice(2).map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>
                <LaunchDisplayAmount value={metric.value} />
              </dd>
              <dd className={styles.marketHint}>{metric.hint}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
