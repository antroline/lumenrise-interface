import { EngravePattern } from '@/features/launches/components/engraving';

const WIDTH = 1000;
const HEIGHT = 260;
const SOLD = 0.42;
const TARGET = 0.74;

/** An illustrative curve with the same shape family as the contract: price grows with (1 / (1 − k·sold))². */
const height = (x: number) => {
  const ratio = (value: number) => (1 / (1 - 0.6 * value)) ** 2;
  return ratio(x) / (ratio(1) * 1.12);
};
const line = Array.from({ length: 81 }, (_, index) => {
  const x = index / 80;
  return `${index ? 'L' : 'M'}${(x * WIDTH).toFixed(1)} ${(HEIGHT - height(x) * HEIGHT).toFixed(1)}`;
}).join(' ');
const area = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

const steps = [
  {
    title: 'Trading opens',
    body: 'At the scheduled time the curve opens. From then on the token is bought from the curve, and sold back to it, in the launch’s pair asset.',
  },
  {
    title: 'The price follows the curve',
    body: 'Each purchase moves the price up the published curve and each sale moves it back down. The area under the curve is what the launch has raised.',
  },
  {
    title: 'Graduation',
    body: 'When the raise reaches the graduation target, the contract marks the launch as graduated and the curve closes.',
  },
];

function Diagram() {
  return (
    <figure className="min-w-0">
      <div className="relative h-[260px]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible text-foreground"
        >
          <defs>
            <EngravePattern id="how-lines" />
            <EngravePattern id="how-ink" className="text-ink" />
            <clipPath id="how-sold">
              <rect width={SOLD * WIDTH} height={HEIGHT} />
            </clipPath>
            <clipPath id="how-target">
              <rect x={SOLD * WIDTH} width={(TARGET - SOLD) * WIDTH} height={HEIGHT} />
            </clipPath>
            <clipPath id="how-beyond">
              <rect x={TARGET * WIDTH} width={(1 - TARGET) * WIDTH} height={HEIGHT} />
            </clipPath>
          </defs>
          <path d={area} clipPath="url(#how-beyond)" fill="url(#how-lines)" className="opacity-[0.12]" />
          <path d={area} clipPath="url(#how-target)" fill="url(#how-lines)" className="opacity-30" />
          <g clipPath="url(#how-sold)">
            <path d={area} className="fill-lime" />
            <path d={area} fill="url(#how-ink)" className="opacity-[0.22]" />
          </g>
          <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>

        <span className="absolute bottom-3 -translate-x-1/2 text-[12.5px] font-medium text-ink" style={{ left: pct(SOLD / 2) }}>
          Raised
        </span>

        <div aria-hidden="true" className="absolute inset-y-0 w-0" style={{ left: pct(TARGET) }}>
          <span className="absolute inset-y-0 left-0 w-[1.5px] -translate-x-1/2 bg-chart-5" />
          <span className="absolute top-0 right-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-2.5 text-[12px] font-medium whitespace-nowrap shadow-[0_1px_2px_rgb(0_0_0/0.08),0_4px_12px_-6px_rgb(0_0_0/0.25)] ring-1 ring-chart-5/45 dark:shadow-none">
            <span className="size-2 rounded-full bg-chart-5" />
            Graduation target
          </span>
        </div>

        <div aria-hidden="true" className="absolute size-0" style={{ left: pct(SOLD), bottom: pct(height(SOLD)) }}>
          <span className="absolute size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-lime ring-[2.5px] ring-foreground" />
          <span className="absolute bottom-3.5 left-1 inline-flex h-7 items-center rounded-full bg-foreground px-2.5 text-[12px] font-medium whitespace-nowrap text-background">
            Price now
          </span>
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-4 border-t border-foreground/80 pt-2 text-[12px] text-muted-foreground">
        <span>Opening price</span>
        <span>Tokens sold on the curve</span>
      </div>
      <figcaption className="mt-3 text-[12.5px] text-muted-foreground">
        Diagram. Each launch publishes its own curve parameters and graduation target on its page.
      </figcaption>
    </figure>
  );
}

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="grid gap-10 rounded-2xl bg-card p-5 text-card-foreground ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-6px_rgb(0_0_0/0.08)] sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-14 lg:p-10 dark:shadow-none dark:ring-white/[0.07]"
    >
      <div>
        <h2 id="how-heading" className="text-[22px] leading-tight font-semibold tracking-[-0.03em] sm:text-[24px]">
          From opening to graduation
        </h2>
        <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
          There is no order book. The contract sets the price from how many tokens have been sold.
        </p>
        <ol className="relative mt-8 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11.5px] before:w-px before:bg-divider">
          {steps.map((step, index) => (
            <li key={step.title} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-4">
              <span className="relative grid size-6 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background tabular-nums">
                {index + 1}
              </span>
              <div>
                <h3 className="text-[16px] leading-6 font-semibold tracking-[-0.01em]">{step.title}</h3>
                <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 border-t border-divider pt-4 text-[13px] leading-relaxed text-muted-foreground">
          If the target is not reached before the configured end, the launch fails and holders can sell back to the curve.
        </p>
      </div>
      <Diagram />
    </section>
  );
}
