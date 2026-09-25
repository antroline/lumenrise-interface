import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const iconTileVariants = cva('grid shrink-0 place-items-center [&_svg]:shrink-0', {
  variants: {
    tone: {
      default: 'bg-secondary text-foreground',
      dark: 'bg-foreground text-background',
      lime: 'bg-lime text-ink',
      ok: 'bg-ok-soft text-ok',
    },
    size: {
      default: 'size-9 rounded-lg [&_svg:not([class*=size-])]:size-[18px]',
      sm: 'size-7 rounded-md [&_svg:not([class*=size-])]:size-3.5',
    },
  },
  defaultVariants: { tone: 'default', size: 'default' },
})

export function IconTile({
  tone,
  size,
  className,
  children,
}: VariantProps<typeof iconTileVariants> & { className?: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn(iconTileVariants({ tone, size }), className)}>
      {children}
    </span>
  )
}
