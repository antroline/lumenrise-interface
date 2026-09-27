import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left text-ui leading-normal text-secondary-foreground [&>svg]:mt-px [&>svg]:shrink-0 [&>svg]:text-foreground [&>svg:not([class*='size-'])]:size-4 [&_b]:font-semibold [&_b]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        info: "bg-info-soft",
        warn: "bg-warn-soft",
      },
      size: {
        default: "",
        sm: "px-3.5 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Alert({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="note"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("min-w-0 flex-1 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
