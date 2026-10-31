import { cn } from '@/lib/utils'

export function LogoSymbol({ className, size = 26, animated = false }: { className?: string; size?: number; animated?: boolean }) {
  return (
    <>
      <picture className="block dark:hidden">
        {animated && <source media="(prefers-reduced-motion: reduce)" srcSet="/assets/logo/lumenrise-mark-primary-light.svg" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={animated ? '/assets/logo/lumenrise-mark-animated-light.svg' : '/assets/logo/lumenrise-mark-primary-light.svg'}
          alt=""
          width={size}
          height={size}
          className={cn('block dark:hidden', className)}
        />
      </picture>
      <picture className="hidden dark:block">
        {animated && <source media="(prefers-reduced-motion: reduce)" srcSet="/assets/logo/lumenrise-mark-reversed-dark.svg" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={animated ? '/assets/logo/lumenrise-mark-animated-dark.svg' : '/assets/logo/lumenrise-mark-reversed-dark.svg'}
          alt=""
          width={size}
          height={size}
          className={cn('hidden dark:block', className)}
        />
      </picture>
    </>
  )
}

export function LogoHorizontal({ className, height = 20 }: { className?: string; height?: number; variant?: 'default' | 'lime' }) {
  const width = Math.round((height * 886.6) / 200)
  const lightSrc = '/assets/logo/lumenrise-lockup-horizontal-light.svg'
  const darkSrc = '/assets/logo/lumenrise-lockup-horizontal-dark.svg'
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lightSrc}
        alt="LumenRise"
        width={width}
        height={height}
        className={cn('block dark:hidden', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={darkSrc}
        alt="LumenRise"
        width={width}
        height={height}
        className={cn('hidden dark:block', className)}
      />
    </>
  )
}
