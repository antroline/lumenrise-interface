import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold tracking-[-0.005em] whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-lime/60 active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed disabled:border-transparent disabled:bg-secondary disabled:text-faint aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-lime-hover",
        dark: "bg-foreground text-background hover:bg-foreground/85",
        outline:
          "border-border bg-background text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-foreground hover:bg-border aria-expanded:bg-border",
        ghost:
          "text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        destructive:
          "border-bad-line bg-background text-bad hover:bg-bad-soft",
        link: "h-auto! px-0! font-medium text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[42px] px-[18px]",
        xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
        sm: "h-[34px] gap-1.5 rounded-[9px] px-3 text-ui",
        lg: "h-[50px] rounded-xl px-6 text-[15px]",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-[34px] rounded-[9px]",
        "icon-lg": "size-[50px] rounded-xl",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
