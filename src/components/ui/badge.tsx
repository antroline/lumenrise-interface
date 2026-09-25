import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-border bg-background font-medium whitespace-nowrap text-secondary-foreground transition-colors focus-visible:ring-3 focus-visible:ring-lime/60 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    // `size` is declared before `variant` so the tag variants can override pill sizing.
    variants: {
      size: {
        default: "h-[26px] px-2.5 text-small",
        sm: "h-[22px] px-2 text-[11.5px]",
      },
      variant: {
        default: "",
        live: "border-foreground bg-foreground text-background dark:border-border dark:bg-secondary dark:text-foreground",
        soft: "border-transparent bg-secondary",
        ok: "border-transparent bg-ok-soft text-ok",
        warn: "border-transparent bg-warn-soft text-warn",
        bad: "border-transparent bg-bad-soft text-bad",
        info: "border-transparent bg-info-soft text-info",
        lime: "border-lime bg-lime text-ink",
        net: "font-mono text-caption tracking-[0.04em]",
        tag: "h-auto gap-[5px] rounded-sm border-transparent bg-secondary px-2 py-[3px] font-mono text-caption",
        "tag-outline": "h-auto gap-[5px] rounded-sm px-2 py-[3px] font-mono text-caption",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
