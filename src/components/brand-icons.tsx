import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type IconProps = SVGProps<SVGSVGElement>

function FilledIcon({ d, className, ...props }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn('size-4 shrink-0', className)} {...props}>
      <path d={d} />
    </svg>
  )
}

export function GithubIcon(props: IconProps) {
  return (
    <FilledIcon
      d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"
      {...props}
    />
  )
}

export function XLogoIcon(props: IconProps) {
  return (
    <FilledIcon
      d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zM17.6 20.6h2L6.5 3.2H4.3z"
      {...props}
    />
  )
}

export function TelegramIcon(props: IconProps) {
  return (
    <FilledIcon
      d="M21.9 3.2 2.6 10.6c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 1.9 5.8c.2.7.4.9 1 .9.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8L23 4.5c.3-1.3-.5-1.8-1.1-1.3zM8.6 13.4l9.7-6.1c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.5z"
      {...props}
    />
  )
}

export function DiscordIcon(props: IconProps) {
  return (
    <FilledIcon
      d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.5 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.7 19.7 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.6 19.6 0 0 0 6-3c.5-5.2-.9-9.8-3.6-13.8zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.5-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.4-2.2 2.4z"
      {...props}
    />
  )
}

export function FarcasterIcon(props: IconProps) {
  return (
    <FilledIcon
      d="M4.5 3h15v18h-2.6v-8.2a4.9 4.9 0 0 0-9.8 0V21H4.5zM2.3 5.6h2.2V21H2.3zm17.2 0h2.2V21h-2.2z"
      {...props}
    />
  )
}

export function StellarIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
      {...props}
    >
      <path d="M19.5 6.2A9 9 0 0 0 4 15.2" />
      <path d="M4.5 17.8A9 9 0 0 0 20 8.8" />
      <path d="M2.5 14.5 21.5 7M2.5 17 21.5 9.5" />
    </svg>
  )
}
