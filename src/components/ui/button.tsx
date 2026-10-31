import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold tracking-[-0.005em] whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:not-aria-[haspopup]:translate-y-px motion-reduce:transition-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-secondary disabled:text-faint aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-lime-hover",
        dark: "bg-foreground text-background hover:bg-foreground/85",
        outline:
          "border-border bg-background text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary:
          "border-border bg-secondary text-foreground hover:bg-border aria-expanded:bg-border",
        // Half-strength secondary keeps ghost below the resting secondary emphasis in both themes.
        ghost:
          "text-foreground hover:bg-ghost-hover aria-expanded:bg-ghost-hover",
        destructive:
          "border-bad-line bg-background text-bad hover:bg-bad-soft",
        link: "h-auto! px-0! font-medium text-foreground underline-offset-4 hover:underline",
      },
      // xs sizes target dense desktop toolbars; touch-critical and primary actions use default/lg (46px+).
      size: {
        default: "h-control px-[18px]",
        xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
        sm: "h-control-sm gap-1.5 rounded-md px-3 text-ui",
        lg: "h-control-lg rounded-xl px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-control-sm rounded-md",
        "icon-lg": "size-control-lg rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  focusableWhenDisabled,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), loading && "cursor-wait [&>svg:not([data-slot=spinner])]:hidden", className)}
      {...props}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading && <Spinner data-icon="inline-start" aria-hidden="true" role={undefined} aria-label={undefined} className="motion-reduce:animate-none" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
