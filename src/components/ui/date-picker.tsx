
import * as React from "react"
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar"

interface DatePickerProps {
  mode: "single" | "range" | "multiple"
  selected: Date | Date[] | DateRange | undefined
  onSelect: (date: Date | DateRange | Date[] | undefined) => void
  disabledDate?: (date: Date) => boolean
  initialFocus?: boolean
  className?: string
}

interface DateRange {
  from: Date
  to?: Date
}

export function DatePicker({
  mode,
  selected,
  onSelect,
  disabledDate,
  initialFocus,
  className
}: DatePickerProps) {
  return (
    <CalendarPrimitive
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      disabled={disabledDate}
      initialFocus={initialFocus}
      className={className}
    />
  )
}
