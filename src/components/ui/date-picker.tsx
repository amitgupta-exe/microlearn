
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  mode?: "single" | "range" | "multiple";
  selected?: Date | Date[] | undefined;
  onSelect?: (date: Date | Date[] | undefined) => void;
  disabled?: boolean;
  disabledDate?: (date: Date) => boolean;
  initialFocus?: boolean;
  className?: string;
}

export function DatePicker({
  mode = "single",
  selected,
  onSelect,
  disabled,
  disabledDate,
  initialFocus,
  className,
}: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Calendar
        mode={mode as any}
        selected={selected}
        onSelect={onSelect as any}
        disabled={disabled}
        disabledDate={disabledDate}
        initialFocus={initialFocus}
      />
    </div>
  );
}
