import { cn } from '@/lib/utils'

export function LogoSymbol({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/lumenrise-symbol-for-light-background.svg"
        alt=""
        width={size}
        height={size}
        className={cn('block dark:hidden', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/lumenrise-symbol-for-dark-background.svg"
        alt=""
        width={size}
        height={size}
        className={cn('hidden dark:block', className)}
      />
    </>
  )
}

export function LogoHorizontal({ className, height = 20, variant = 'default' }: { className?: string; height?: number; variant?: 'default' | 'lime' }) {
  const width = Math.round((height * 481) / 100)
  const lightSrc = variant === 'lime' ? '/branding/lumenrise-logo-lime-gray-ink.svg' : '/branding/lumenrise-logo-horizontal-for-light-background.svg'
  const darkSrc = variant === 'lime' ? '/branding/lumenrise-logo-lime-gray-light.svg' : '/branding/lumenrise-logo-horizontal-for-dark-background.svg'
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
