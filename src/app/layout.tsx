import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { Providers } from '@/components/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmationRecovery } from '@/features/launches/hooks/use-trade-queue'
import './globals.css'

const bricolage = localFont({
  src: '../../public/fonts/BricolageGrotesque-Variable.ttf',
  weight: '200 800',
  variable: '--font-bricolage',
  display: 'swap',
})

const barlow = localFont({
  src: [
    { path: '../../public/fonts/BarlowSemiCondensed-Regular.ttf', weight: '400' },
    { path: '../../public/fonts/BarlowSemiCondensed-Medium.ttf', weight: '500' },
    { path: '../../public/fonts/BarlowSemiCondensed-SemiBold.ttf', weight: '600' },
    { path: '../../public/fonts/BarlowSemiCondensed-Bold.ttf', weight: '700' },
  ],
  variable: '--font-barlow',
  display: 'swap',
  preload: false,
})

const siteTitle = 'LumenRise Platform: Launch your token'
const siteDescription =
  'Set up and run a token launch with a bonding curve, presale or auction, from setup to graduation.'

export const metadata: Metadata = {
  metadataBase: new URL('https://platform.lumenrise.app'),
  title: {
    default: siteTitle,
    template: '%s · LumenRise',
  },
  description: siteDescription,
  openGraph: {
    type: 'website',
    siteName: 'LumenRise',
    locale: 'en_US',
    url: './',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/og/lumenrise-og-site-platform-1200x630.jpg',
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/og/lumenrise-x-site-platform-1200x600.jpg',
        alt: siteTitle,
      },
    ],
  },
  icons: { icon: { url: '/assets/logo/lumenrise-favicon-adaptive.svg', type: 'image/svg+xml', sizes: 'any' } },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#020202' },
  ],
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('lumenrise:theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${barlow.variable} font-sans`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="max-lg:min-w-0">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers apiBaseUrl={process.env.LUMENRISE_API_URL ?? ''}>
          <ConfirmationRecovery />
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
