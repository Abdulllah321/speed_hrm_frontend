"use client";

import React, { type FC, useState, useEffect, useRef, JSX } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Calendar as CalendarIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
  dateRange?: {
    oldestDate: Date | null;
    latestDate: Date | null;
  };
  range?: DateRange | undefined;
  isPreset?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const formatDate = (date: Date, locale: string = "en-us"): string => {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    return dateInput;
  }
};

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets
const PRESETS: Preset[] = [
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
  { name: "thisWeek", label: "This Week" },
  { name: "last3", label: "Last 3 days" },
  { name: "last15", label: "Last 15 days" },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> & {
  filePath: string;
} = ({
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  locale = "en-US",
  showCompare = false,
  dateRange,
  range: passedRange,
  align = "start",
  isPreset = true,
  className,
  disabled,
  placeholder = "Select date range",
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);

  const [range, setRange] = useState<DateRange>(() => {
    if (passedRange) {
      return {
        from: passedRange.from ? startOfDay(passedRange.from) : undefined,
        to: passedRange.to ? endOfDay(passedRange.to) : undefined,
      };
    }
    return {
      from: initialDateFrom ? startOfDay(getDateAdjustedForTimezone(initialDateFrom)) : undefined,
      to: initialDateTo ? endOfDay(getDateAdjustedForTimezone(initialDateTo)) : undefined,
    };
  });

  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: startOfDay(getDateAdjustedForTimezone(initialCompareFrom)),
          to: initialCompareTo
            ? endOfDay(getDateAdjustedForTimezone(initialCompareTo))
            : undefined,
        }
      : undefined
  );

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined);
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );

  // Generate years for dropdown (from oldestDate to latestDate or current year)
  const getAvailableYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    let startYear: number;
    let endYear: number;
    
    if (dateRange?.oldestDate && dateRange?.latestDate) {
      startYear = new Date(dateRange.oldestDate).getFullYear();
      endYear = new Date(dateRange.latestDate).getFullYear();
    } else {
      // Default: show 10 years back and 2 years forward
      startYear = currentYear - 10;
      endYear = currentYear + 2;
    }
    
    const years: number[] = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years.reverse(); // Most recent first
  };

  const availableYears = getAvailableYears();

  useEffect(() => {
    if (passedRange) {
      setRange({
        from: passedRange.from ? startOfDay(passedRange.from) : undefined,
        to: passedRange.to ? endOfDay(passedRange.to) : undefined,
      });
    }
  }, [passedRange]);

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getPresetRange = (presetName: string, selectedYear?: number): { from: Date; to: Date } => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    
    const today = new Date();
    const from = new Date();
    const to = new Date();
    
    switch (preset.name) {
      case "thisMonth":
        // Current month of selected year (or current year)
        const thisMonthYear = selectedYear ?? today.getFullYear();
        const thisMonthMonth = selectedYear === today.getFullYear() ? today.getMonth() : today.getMonth();
        from.setFullYear(thisMonthYear, thisMonthMonth, 1);
        from.setHours(0, 0, 0, 0);
        to.setFullYear(thisMonthYear, thisMonthMonth + 1, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "lastMonth":
        // Previous month of selected year (or current year)
        const lastMonthYear = selectedYear ?? today.getFullYear();
        const lastMonthMonth = selectedYear === today.getFullYear() ? today.getMonth() - 1 : today.getMonth() - 1;
        from.setFullYear(lastMonthYear, lastMonthMonth, 1);
        from.setHours(0, 0, 0, 0);
        to.setFullYear(lastMonthYear, lastMonthMonth + 1, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        // Current week (always relative to today, not year-specific)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        from.setTime(weekStart.getTime());
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() - today.getDay() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        to.setTime(weekEnd.getTime());
        break;
      case "last3":
        // Last 3 days from today (always relative to today)
        from.setDate(today.getDate() - 2);
        from.setHours(0, 0, 0, 0);
        to.setTime(today.getTime());
        to.setHours(23, 59, 59, 999);
        break;
      case "last15":
        // Last 15 days from today (always relative to today)
        from.setDate(today.getDate() - 14);
        from.setHours(0, 0, 0, 0);
        to.setTime(today.getTime());
        to.setHours(23, 59, 59, 999);
        break;
    }

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const presetRange = getPresetRange(preset, currentYear);
    const newRange: DateRange = {
      from: startOfDay(presetRange.from),
      to: endOfDay(presetRange.to),
    };
    setRange(newRange);
    setSelectedPreset(preset);
    setIsSelecting(false);
    isSelectingRef.current = false;
    
    // Auto-close after preset selection
    setTimeout(() => {
      setIsOpen(false);
      onUpdate?.({ range: newRange, rangeCompare });
    }, 150);
  };

  const handleSelect = (selectedRange: { from?: Date; to?: Date } | undefined) => {
    if (!selectedRange) {
      const clearedRange: DateRange = { from: undefined, to: undefined };
      setRange(clearedRange);
      setSelectedPreset(undefined);
      setIsSelecting(false);
      isSelectingRef.current = false;
      if (onUpdate) {
        onUpdate({ range: clearedRange, rangeCompare });
      }
      return;
    }

    const newRange: DateRange = {
      from: selectedRange.from ? startOfDay(selectedRange.from) : undefined,
      to: selectedRange.to ? endOfDay(selectedRange.to) : undefined,
    };

    setRange(newRange);
    setSelectedPreset(undefined);

    // Track if we're in the middle of selecting (have "from" but not "to")
    const hasFromButNotTo = !!newRange.from && !newRange.to;
    isSelectingRef.current = hasFromButNotTo;
    setIsSelecting(hasFromButNotTo);

    // Only auto-close when both dates are selected
    if (newRange.from && newRange.to) {
      isSelectingRef.current = false;
      setIsSelecting(false);
      setTimeout(() => {
        setIsOpen(false);
        if (onUpdate) {
          onUpdate({ range: newRange, rangeCompare });
        }
      }, 200);
    } else if (onUpdate) {
      onUpdate({ range: newRange, rangeCompare });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isSelectingRef.current) {
      return; // Don't close if we're still selecting
    }
    setIsOpen(open);
    if (!open) {
      setIsSelecting(false);
      isSelectingRef.current = false;
    }
  };

  const formatDateRange = () => {
    if (!range.from && !range.to) {
      return placeholder;
    }
    if (range.from && range.to) {
      if (isSameDay(range.from, range.to)) {
        return format(range.from, "MMM d, yyyy");
      }
      return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
    }
    if (range.from) {
      return `${format(range.from, "MMM d, yyyy")} - ...`;
    }
    return placeholder;
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year, 10);
    
    // If a preset is selected, update the preset range for the new year
    if (selectedPreset) {
      const presetRange = getPresetRange(selectedPreset, yearNum);
      const newRange: DateRange = {
        from: startOfDay(presetRange.from),
        to: endOfDay(presetRange.to),
      };
      setRange(newRange);
      if (onUpdate) {
        onUpdate({ range: newRange, rangeCompare });
      }
    } else {
      // Otherwise, just update the year of the current range
      const currentMonth = range.from?.getMonth() ?? new Date().getMonth();
      const currentDay = range.from?.getDate() ?? 1;
      const newFromDate = new Date(yearNum, currentMonth, currentDay);
      
      const currentToMonth = range.to?.getMonth() ?? new Date().getMonth();
      const currentToDay = range.to?.getDate() ?? new Date().getDate();
      const newToDate = new Date(yearNum, currentToMonth, currentToDay);
      
      if (dateRange?.oldestDate && newFromDate < new Date(dateRange.oldestDate)) {
        return;
      }
      if (dateRange?.latestDate && newToDate > new Date(dateRange.latestDate)) {
        return;
      }

      setRange({
        from: startOfDay(newFromDate),
        to: range.to ? endOfDay(newToDate) : undefined,
      });
    }
  };

  const currentYear = range.from?.getFullYear() ?? new Date().getFullYear();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            (!range.from || !range.to) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-sm">{formatDateRange()}</span>
          {isOpen ? (
            <ChevronUpIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          ) : (
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-2 max-w-[480px]"
        onInteractOutside={(e) => {
          if (isSelectingRef.current) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={() => {
          isSelectingRef.current = false;
          setIsSelecting(false);
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Preset Tabs with Year Selector */}
          {isPreset && (
            <div 
              className="flex items-center gap-1.5 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] hover:[scrollbar-width:thin] mask-l-from-95% mask-r-from-95% pl-[5%] pr-[5%]"
              style={{
                WebkitOverflowScrolling: 'touch',
              }}
              onWheel={(e) => {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollLeft += e.deltaY;
              }}
            >
              {/* Year Selector as first item */}
              <Select
                value={currentYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="h-7 w-[85px] text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[200px] [&>div:first-child]:relative [&>div:first-child]:before:content-[''] [&>div:first-child]:before:absolute [&>div:first-child]:before:top-0 [&>div:first-child]:before:left-0 [&>div:first-child]:before:right-0 [&>div:first-child]:before:h-4 [&>div:first-child]:before:bg-[linear-gradient(to_bottom,hsl(var(--popover)),transparent)] [&>div:first-child]:before:pointer-events-none [&>div:first-child]:before:z-10 [&>div:first-child]:after:content-[''] [&>div:first-child]:after:absolute [&>div:first-child]:after:bottom-0 [&>div:first-child]:after:left-0 [&>div:first-child]:after:right-0 [&>div:first-child]:after:h-4 [&>div:first-child]:after:bg-[linear-gradient(to_top,hsl(var(--popover)),transparent)] [&>div:first-child]:after:pointer-events-none [&>div:first-child]:after:z-10"
                  position="popper"
                >
                  {availableYears.length > 0 ? (
                    availableYears.map((year) => (
                      <SelectItem 
                        key={year} 
                        value={year.toString()} 
                        className="text-xs py-2 cursor-pointer hover:bg-accent"
                      >
                        {year}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={currentYear.toString()} className="text-xs py-2">
                      {currentYear}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Preset Buttons */}
              {PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant={selectedPreset === preset.name ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs px-3 transition-all shrink-0",
                    selectedPreset === preset.name 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => setPreset(preset.name)}
                  type="button"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Year Selection - Only show if presets are disabled */}
          {!isPreset && (
            <div className="flex items-center gap-2 pb-1.5 border-b">
              <span className="text-xs font-medium text-foreground whitespace-nowrap">Year:</span>
              <Select
                value={currentYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="max-h-[200px] [&>div:first-child]:relative [&>div:first-child]:before:content-[''] [&>div:first-child]:before:absolute [&>div:first-child]:before:top-0 [&>div:first-child]:before:left-0 [&>div:first-child]:before:right-0 [&>div:first-child]:before:h-4 [&>div:first-child]:before:bg-[linear-gradient(to_bottom,hsl(var(--popover)),transparent)] [&>div:first-child]:before:pointer-events-none [&>div:first-child]:before:z-10 [&>div:first-child]:after:content-[''] [&>div:first-child]:after:absolute [&>div:first-child]:after:bottom-0 [&>div:first-child]:after:left-0 [&>div:first-child]:after:right-0 [&>div:first-child]:after:h-4 [&>div:first-child]:after:bg-[linear-gradient(to_top,hsl(var(--popover)),transparent)] [&>div:first-child]:after:pointer-events-none [&>div:first-child]:after:z-10"
                  position="popper"
                >
                  {availableYears.length > 0 ? (
                    availableYears.map((year) => (
                      <SelectItem 
                        key={year} 
                        value={year.toString()} 
                        className="text-xs py-2 cursor-pointer hover:bg-accent"
                      >
                        {year}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={currentYear.toString()} className="text-xs py-2">
                      {currentYear}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Calendar */}
          <div className="border-t pt-1.5">
            <Calendar
              mode="range"
              selected={{
                from: range.from,
                to: range.to,
              }}
              onSelect={handleSelect}
              numberOfMonths={isSmallScreen ? 1 : 2}
              captionLayout="label"
              fromYear={dateRange?.oldestDate ? new Date(dateRange.oldestDate).getFullYear() : 1970}
              toYear={dateRange?.latestDate ? new Date(dateRange.latestDate).getFullYear() : new Date().getFullYear() + 10}
              defaultMonth={(range.from || new Date()) as Date}
              disabled={(date) => {
                if (!dateRange?.oldestDate || !dateRange?.latestDate) return false;
                return (
                  date < new Date(dateRange.oldestDate) ||
                  date > new Date(dateRange.latestDate)
                );
              }}
              className="[&_.rdp-months]:gap-2 [&_.rdp-month]:space-y-1 [&_.rdp-cell]:size-7 [&_.rdp-button]:size-7 [&_.rdp-day]:size-7 [&_.rdp-day_button]:text-xs [&_.rdp-caption]:text-xs [&_.rdp-dropdown]:text-xs [&_.rdp-dropdown]:h-7 [&_.rdp-nav]:h-7 [&_.rdp-button_previous]:size-7 [&_.rdp-button_next]:size-7 [&_.rdp-month_caption]:h-7 [&_.rdp-dropdown_root]:h-7 [&_.rdp-root]:p-2"
            />
          </div>

          {/* Selection hint when only "from" is selected */}
          {isSelecting && (
            <div className="text-xs text-muted-foreground text-center pt-1.5 border-t">
              Select end date to complete range
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.displayName = "DateRangePicker";
DateRangePicker.filePath = "components/ui/date-range-picker.tsx";
