"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-lime/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "rounded-md text-muted-foreground hover:text-foreground data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:data-pressed:bg-card",
        chip: "rounded-full border bg-background text-secondary-foreground hover:border-faint data-pressed:border-emphasis data-pressed:bg-emphasis data-pressed:text-emphasis-foreground",
      },
      size: {
        default: "h-[30px] px-3 text-ui",
        sm: "h-[26px] px-2.5 text-caption",
        lg: "h-[34px] px-3.5 text-ui",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
