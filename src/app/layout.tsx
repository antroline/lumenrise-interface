import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { Providers } from '@/components/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const bricolage = localFont({
  src: [
    { path: '../../public/fonts/Bricolage-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Bricolage-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Bricolage-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-bricolage',
  display: 'swap',
})

const plexMono = localFont({
  src: [{ path: '../../public/fonts/IBMPlexMono-Regular.ttf', weight: '400', style: 'normal' }],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'LumenRise — Identity, reputation, and launch infrastructure for Stellar',
    template: '%s · LumenRise',
  },
  description:
    'Identity, reputation, and launch infrastructure for Stellar. Transparent, reputation-gated launches — from discovery to settlement.',
  icons: { icon: { url: '/branding/lumenrise-symbol-for-light-background.svg', type: 'image/svg+xml' } },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e0d' },
  ],
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('lumenrise:theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${plexMono.variable} font-sans`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
