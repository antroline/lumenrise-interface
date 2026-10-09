import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Launch } from '@/lib/data'

export function FeaturedProjectLink({ launch }: { launch: Launch }) {
  return (
    <Button size="lg" className="w-full sm:w-fit" render={<Link href={`/launch/${launch.slug}`} />} nativeButton={false}>
      Project Detail
      <ArrowRight data-icon="inline-end" />
    </Button>
  )
}
