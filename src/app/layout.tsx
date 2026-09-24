import type { Metadata, Viewport } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'
import { Providers } from '@/components/providers'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Launchpad — Stellar launches with reputation',
  description: 'Identity, reputation, and launch infrastructure for Stellar.',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable} font-sans`} data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
