"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const trackVariants = cva(
  "relative flex w-full items-center overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: { default: "h-1.5", thin: "h-1", thick: "h-2.5" },
    },
    defaultVariants: { size: "default" },
  }
)

const indicatorVariants = cva("h-full rounded-full transition-all", {
  variants: {
    tone: { default: "bg-emphasis", lime: "bg-lime" },
  },
  defaultVariants: { tone: "default" },
})

function Progress({
  className,
  children,
  value,
  size,
  tone,
  ...props
}: ProgressPrimitive.Root.Props &
  VariantProps<typeof trackVariants> &
  VariantProps<typeof indicatorVariants>) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack size={size}>
        <ProgressIndicator tone={tone} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({
  className,
  size,
  ...props
}: ProgressPrimitive.Track.Props & VariantProps<typeof trackVariants>) {
  return (
    <ProgressPrimitive.Track
      className={cn(trackVariants({ size }), className)}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  tone,
  ...props
}: ProgressPrimitive.Indicator.Props & VariantProps<typeof indicatorVariants>) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(indicatorVariants({ tone }), className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn("ml-auto text-sm text-muted-foreground tabular-nums", className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
