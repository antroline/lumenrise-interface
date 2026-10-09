import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col justify-center border-y border-divider py-12">
      <span className="font-mono text-small text-muted-foreground">404 / NOT FOUND</span>
      <h1 className="mt-5 text-[36px] leading-tight font-bold tracking-[-0.04em] sm:text-h1">This page doesn’t exist</h1>
      <p className="mt-4 max-w-[55ch] text-base text-muted-foreground">The link may be outdated or the launch may have moved. Browse live and upcoming launches instead.</p>
      <Button variant="dark" className="mt-8 self-start" render={<Link href="/" />} nativeButton={false}>Explore launches<ArrowRight data-icon="inline-end" /></Button>
    </section>
  )
}
