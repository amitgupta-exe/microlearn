
import * as React from "react"
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar"

interface DatePickerProps {
  mode: "single" | "range" | "multiple"
  selected: Date | Date[] | { from: Date; to?: Date } | undefined
  onSelect: (date: Date | { from: Date; to?: Date } | Date[] | undefined) => void
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
      mode={mode as any}
      selected={selected}
      onSelect={onSelect as any}
      disabled={disabledDate}
      initialFocus={initialFocus}
      className={className}
    />
  )
}
