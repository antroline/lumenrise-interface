"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { cn } from "@/lib/utils"

function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return <DayPicker
    showOutsideDays
    className={cn("w-fit p-3", className)}
    classNames={{
      months: "relative flex flex-col",
      month: "flex flex-col gap-3",
      month_caption: "flex h-9 items-center justify-center px-10 text-sm font-semibold",
      nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
      button_previous: "grid size-8 place-items-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60",
      button_next: "grid size-8 place-items-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60",
      month_grid: "border-collapse",
      weekdays: "flex",
      weekday: "grid size-9 place-items-center text-xs font-medium text-muted-foreground",
      week: "flex",
      day: "size-9 p-0 text-center text-sm [&[data-selected=true]>button]:bg-foreground [&[data-selected=true]>button]:text-background",
      day_button: "grid size-9 place-items-center rounded-lg text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60",
      today: "[&>button]:font-bold [&>button]:underline [&>button]:underline-offset-4",
      outside: "text-muted-foreground/60",
      disabled: "opacity-35",
      hidden: "invisible",
      ...classNames,
    }}
    components={{ Chevron: ({ orientation, ...iconProps }) => orientation === "left" ? <ChevronLeft {...iconProps} className="size-4" /> : <ChevronRight {...iconProps} className="size-4" /> }}
    {...props}
  />
}

export { Calendar }
