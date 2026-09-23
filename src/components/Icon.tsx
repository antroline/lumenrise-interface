export type IconName =
  | 'arrow'
  | 'check'
  | 'copy'
  | 'external'
  | 'github'
  | 'gitlab'
  | 'lock'
  | 'logout'
  | 'search'
  | 'settings'
  | 'shield'
  | 'spark'
  | 'wallet'
  | 'x'

type IconProps = {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  if (name === 'arrow') {
    return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5" /></svg>
  }
  if (name === 'check') {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  }
  if (name === 'copy') {
    return <svg {...common}><rect x="8" y="8" width="10" height="10" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
  }
  if (name === 'external') {
    return <svg {...common}><path d="M14 5h5v5M19 5l-8 8" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
  }
  if (name === 'github') {
    return <svg {...common}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3a5.4 5.4 0 0 0-.1-4S18-1.4 15 1a13.4 13.4 0 0 0-6 0C6-1.4 4.8-1 4.8-1a5.4 5.4 0 0 0-.1 4A5.8 5.8 0 0 0 3.2 7.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 9 18v4" /><path d="M9 19c-3 .9-3-1.5-4.2-2" /></svg>
  }
  if (name === 'gitlab') {
    return <svg {...common}><path d="m12 21 8.5-6.2-3.2-10-2.1 6.4H8.8L6.7 4.8l-3.2 10L12 21Z" /><path d="m8.8 11.2 3.2 9.6 3.2-9.6" /></svg>
  }
  if (name === 'lock') {
    return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  }
  if (name === 'logout') {
    return <svg {...common}><path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" /></svg>
  }
  if (name === 'search') {
    return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  }
  if (name === 'settings') {
    return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21h-4v-.1A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.7 14H2v-4h.7a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L6.7 4l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 2.8V2h4v.8a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1L20 6.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.8v4h-.8a1.8 1.8 0 0 0-1.8 1Z" /></svg>
  }
  if (name === 'shield') {
    return <svg {...common}><path d="M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></svg>
  }
  if (name === 'spark') {
    return <svg {...common}><path d="M12 2 9.8 9.8 2 12l7.8 2.2L12 22l2.2-7.8L22 12l-7.8-2.2L12 2Z" /></svg>
  }
  if (name === 'wallet') {
    return <svg {...common}><path d="M4 5h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /><path d="M5 5V3h12v2" /></svg>
  }
  if (name === 'x') {
    return <svg {...common}><path d="M18 3h3l-6.6 7.5L22 21h-6l-4.7-6.1L6 21H3l6.9-7.9L2.6 3h6.2l4.2 5.6L18 3Z" /></svg>
  }

  return null
}
