"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "motion/react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface MonthYearPickerProps {
  value?: string; // Format: "YYYY-MM"
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}

export function MonthYearPicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Select month and year",
  fromYear = 2020,
  toYear = new Date().getFullYear() + 5,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(
    value ? parseInt(value.split("-")[1]) - 1 : null
  );
  const [selectedYear, setSelectedYear] = React.useState<number | null>(
    value ? parseInt(value.split("-")[0]) : null
  );
  const [viewYear, setViewYear] = React.useState(
    value ? parseInt(value.split("-")[0]) : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(
    value ? parseInt(value.split("-")[1]) - 1 : new Date().getMonth()
  );

  React.useEffect(() => {
    if (value) {
      const [year, month] = value.split("-").map(Number);
      setSelectedMonth(month - 1);
      setSelectedYear(year);
      setViewYear(year);
      setViewMonth(month - 1);
    } else {
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  }, [value]);

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setViewMonth(month);
    // Use viewYear if selectedYear is null (allows immediate month selection)
    const yearToUse = selectedYear !== null ? selectedYear : viewYear;
    setSelectedYear(yearToUse);
    const newValue = `${yearToUse}-${String(month + 1).padStart(2, "0")}`;
    onChange?.(newValue);
    setOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setViewYear(year);
    // If a month is already selected, complete the selection
    if (selectedMonth !== null) {
      const newValue = `${year}-${String(selectedMonth + 1).padStart(2, "0")}`;
      onChange?.(newValue);
      setOpen(false);
    }
    // Otherwise, just update the year and keep popover open for month selection
  };

  const displayValue = React.useMemo(() => {
    if (selectedMonth !== null && selectedYear !== null) {
      return format(new Date(selectedYear, selectedMonth, 1), "MMMM yyyy");
    }
    return "";
  }, [selectedMonth, selectedYear]);

  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = fromYear; year <= toYear; year++) {
      yearList.push(year);
    }
    return yearList;
  }, [fromYear, toYear]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newYear = Math.max(fromYear, viewYear - 1);
                setViewYear(newYear);
              }}
              disabled={viewYear <= fromYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Select
                value={viewYear.toString()}
                onValueChange={(val) => {
                  const year = parseInt(val);
                  setViewYear(year);
                  handleYearSelect(year);
                }}
              >
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newYear = Math.min(toYear, viewYear + 1);
                setViewYear(newYear);
              }}
              disabled={viewYear >= toYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2 w-[280px]">
            <AnimatePresence mode="wait">
              {MONTHS.map((month, index) => {
                // Check if selected using either selectedYear or viewYear
                const yearToCheck = selectedYear !== null ? selectedYear : viewYear;
                const isSelected =
                  selectedMonth === index && yearToCheck === viewYear;
                const isCurrent =
                  index === currentMonth && viewYear === currentYear;
                const isPast = viewYear < currentYear || 
                  (viewYear === currentYear && index < currentMonth);

                return (
                  <motion.button
                    key={`${viewYear}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                      "relative h-12 px-3 text-sm font-medium rounded-md transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      isSelected &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                      isCurrent && !isSelected &&
                        "ring-2 ring-primary/20 bg-primary/5",
                      isPast && "opacity-60"
                    )}
                  >
                    <span className="truncate">{month.slice(0, 3)}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1"
                      >
                        <div className="h-5 w-5 rounded-full bg-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const today = new Date();
                handleYearSelect(today.getFullYear());
                handleMonthSelect(today.getMonth());
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                onChange?.("");
                setSelectedMonth(null);
                setSelectedYear(null);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
