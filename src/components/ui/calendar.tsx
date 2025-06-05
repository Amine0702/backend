import * as React from "react"
import { DayPicker } from "react-day-picker"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "w-full", // évite le flex ici pour garder une structure table
        month: "w-full",
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: "hidden",
        table: "w-full border-collapse table-fixed", // table-fixed pour alignement stable
        head_row: "", // ne pas mettre display:flex ici
        head_cell:
          "text-muted-foreground text-center text-[0.8rem] font-medium py-1", // jours (lun, mar...)
        row: "", // idem, laisser le comportement table-row
        cell: "text-center p-0", // cellule de date
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "w-10 h-10 p-0 font-normal text-sm mx-auto"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_range_end: "day-range-end",
        day_hidden: "invisible",
        ...classNames,
      }}
      locale={fr}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
