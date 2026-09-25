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

export function LogoHorizontal({ className, height = 20 }: { className?: string; height?: number }) {
  const width = Math.round((height * 481) / 100)
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/lumenrise-logo-horizontal-for-light-background.svg"
        alt="LumenRise"
        width={width}
        height={height}
        className={cn('block dark:hidden', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/lumenrise-logo-horizontal-for-dark-background.svg"
        alt="LumenRise"
        width={width}
        height={height}
        className={cn('hidden dark:block', className)}
      />
    </>
  )
}
