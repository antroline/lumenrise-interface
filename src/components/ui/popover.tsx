"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverTitle = PopoverPrimitive.Title

function PopoverContent({ className, align = "start", sideOffset = 8, ...props }: PopoverPrimitive.Popup.Props & { align?: PopoverPrimitive.Positioner.Props["align"]; sideOffset?: number }) {
  return <PopoverPrimitive.Portal>
    <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50">
      <PopoverPrimitive.Popup data-slot="popover-content" className={cn("w-max max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card text-foreground shadow-lg outline-none transition-[opacity,transform] duration-150 data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:translate-y-1 data-ending-style:opacity-0", className)} {...props} />
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>
}

export { Popover, PopoverTrigger, PopoverContent, PopoverTitle }
