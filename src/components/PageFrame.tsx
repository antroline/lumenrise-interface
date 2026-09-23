import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <Header />
      <main className={className ? `page ${className}` : 'page'}>{children}</main>
      <Footer />
    </>
  )
}
