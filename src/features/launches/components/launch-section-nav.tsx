'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './project-detail.module.css';

const sections = [
  ['launch-overview', 'Overview'],
  ['terms-heading', 'Terms'],
  ['about-heading', 'About'],
  ['tokenomics-heading', 'Tokenomics'],
  ['model-heading', 'Pricing'],
  ['curve-heading', 'Details'],
  ['evidence-heading', 'Evidence'],
  ['team-heading', 'Team'],
  ['updates-heading', 'Updates'],
] as const;

export function LaunchSectionNav() {
  const ref = useRef<HTMLElement>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [active, setActive] = useState('launch-overview');

  useEffect(() => {
    const page = ref.current?.closest('[data-launch-page]');
    if (!page) return;
    let targets: HTMLElement[] = [];
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = targets.filter((target) => target.getBoundingClientRect().top <= 180).at(-1);
      setActive(current?.id ?? 'launch-overview');
    };
    const scan = () => {
      targets = sections.flatMap(([id]) => {
        const element = page.querySelector<HTMLElement>(`#${id}`);
        return element ? [element] : [];
      });
      setAvailable(targets.map((target) => target.id));
      update();
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(page, { childList: true, subtree: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      observer.disconnect();
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav ref={ref} aria-label="Project sections" className={styles.sectionNav}>
      {sections.filter(([id]) => available.includes(id)).map(([id, label]) => (
        <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}
          onClick={(event) => {
            const target = document.getElementById(id);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
            target.focus({ preventScroll: true });
            history.replaceState(null, '', `#${id}`);
            setActive(id);
          }}>{label}</a>
      ))}
    </nav>
  );
}
