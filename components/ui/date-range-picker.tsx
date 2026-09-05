"use client";

import React, {
  type FC,
  useState,
  useEffect,
  useRef,
  useMemo,
  JSX,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Calendar as CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Building2,
  CalendarDays,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Calendar } from "../ui/calendar";
import {
  format,
  startOfDay,
  endOfDay,
  isSameDay,
  differenceInDays,
  isValid,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
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

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

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
  /** Array of date ranges to disable (e.g., already assigned dates) */
  disabledDateRanges?: Array<{ from: Date; to: Date }>;
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  } else {
    return dateInput;
  }
};

const formatDateToInputValue = (d: Date | undefined): string => {
  if (!d || !isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
};

// ─── Fiscal Year Calculations (July 1 to June 30) ────────────────────────────

export interface FiscalYearInfo {
  startYear: number;
  endYear: number;
  key: string;
  label: string;
  fullLabel: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Calculates Pakistan / ERP Fiscal Year (July 1 to June 30).
 * If month >= 6 (July-Dec), FY starts July 1 of current year.
 * If month < 6 (Jan-June), FY starts July 1 of previous year.
 */
export function getFiscalYearInfo(date: Date = new Date()): FiscalYearInfo {
  const validDate = isValid(date) ? date : new Date();
  const m = validDate.getMonth(); // 0 = Jan ... 6 = Jul ... 11 = Dec
  const startYear = m >= 6 ? validDate.getFullYear() : validDate.getFullYear() - 1;
  const endYear = startYear + 1;
  const key = `${startYear}-${endYear}`;
  return {
    startYear,
    endYear,
    key,
    label: `FY ${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`,
    fullLabel: `FY ${startYear}–${endYear}`,
    startDate: new Date(startYear, 6, 1, 0, 0, 0, 0),
    endDate: new Date(endYear, 5, 30, 23, 59, 59, 999),
  };
}

export function generateFiscalYears(
  referenceDate: Date = new Date(),
  countPast: number = 6,
  countFuture: number = 1
): FiscalYearInfo[] {
  const currentFY = getFiscalYearInfo(referenceDate);
  const list: FiscalYearInfo[] = [];

  for (let i = -countFuture; i <= countPast; i++) {
    const startYear = currentFY.startYear - i;
    const endYear = startYear + 1;
    const key = `${startYear}-${endYear}`;
    list.push({
      startYear,
      endYear,
      key,
      label: `FY ${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`,
      fullLabel: `FY ${startYear}–${endYear}`,
      startDate: new Date(startYear, 6, 1, 0, 0, 0, 0),
      endDate: new Date(endYear, 5, 30, 23, 59, 59, 999),
    });
  }
  return list;
}

const FISCAL_MONTHS = [
  { short: "Jul", name: "July", monthIndex: 6, isSecondHalf: false },
  { short: "Aug", name: "August", monthIndex: 7, isSecondHalf: false },
  { short: "Sep", name: "September", monthIndex: 8, isSecondHalf: false },
  { short: "Oct", name: "October", monthIndex: 9, isSecondHalf: false },
  { short: "Nov", name: "November", monthIndex: 10, isSecondHalf: false },
  { short: "Dec", name: "December", monthIndex: 11, isSecondHalf: false },
  { short: "Jan", name: "January", monthIndex: 0, isSecondHalf: true },
  { short: "Feb", name: "February", monthIndex: 1, isSecondHalf: true },
  { short: "Mar", name: "March", monthIndex: 2, isSecondHalf: true },
  { short: "Apr", name: "April", monthIndex: 3, isSecondHalf: true },
  { short: "May", name: "May", monthIndex: 4, isSecondHalf: true },
  { short: "Jun", name: "June", monthIndex: 5, isSecondHalf: true },
];

const CALENDAR_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ─── Component Definition ───────────────────────────────────────────────────

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
  disabledDateRanges = [],
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [presetTab, setPresetTab] = useState<"fiscal" | "calendar">("fiscal");

  // Temporary range being picked
  const [tempRange, setTempRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Navigation month of the calendar
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Confirmed range
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

  // Active Fiscal Year selection for presets
  const availableFiscalYears = useMemo(() => generateFiscalYears(new Date(), 6, 1), []);
  const [selectedFyKey, setSelectedFyKey] = useState<string>(() => {
    const initialDate = range.from || new Date();
    return getFiscalYearInfo(initialDate).key;
  });

  const activeFY = useMemo(() => {
    return (
      availableFiscalYears.find((fy) => fy.key === selectedFyKey) ||
      getFiscalYearInfo(new Date())
    );
  }, [availableFiscalYears, selectedFyKey]);

  // Active Calendar Year selection for standard presets
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = dateRange?.oldestDate
      ? new Date(dateRange.oldestDate).getFullYear()
      : currentYear - 7;
    const endYear = dateRange?.latestDate
      ? new Date(dateRange.latestDate).getFullYear()
      : currentYear + 2;
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years.reverse();
  }, [dateRange]);

  const [selectedCalendarYear, setSelectedCalendarYear] = useState<number>(() => {
    return (range.from || new Date()).getFullYear();
  });

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined);
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 840 : false
  );

  // Direct date input strings
  const [fromInputStr, setFromInputStr] = useState<string>("");
  const [toInputStr, setToInputStr] = useState<string>("");

  // Sync tempRange to direct inputs
  useEffect(() => {
    setFromInputStr(formatDateToInputValue(tempRange.from));
    setToInputStr(formatDateToInputValue(tempRange.to));
  }, [tempRange]);

  // Responsive listener
  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 840);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync external range prop updates
  useEffect(() => {
    if (passedRange) {
      setRange({
        from: passedRange.from ? startOfDay(passedRange.from) : undefined,
        to: passedRange.to ? endOfDay(passedRange.to) : undefined,
      });
    }
  }, [passedRange]);

  // ─── Popover State Management ─────────────────────────────────────────────

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempRange({ from: range.from, to: range.to });
      const initialDate = range.from || new Date();
      setCalendarMonth(initialDate);
      setSelectedFyKey(getFiscalYearInfo(initialDate).key);
      setSelectedCalendarYear(initialDate.getFullYear());
    }
    setIsOpen(open);
  };

  const handleConfirm = () => {
    if (tempRange.from) {
      const confirmedRange: DateRange = {
        from: startOfDay(tempRange.from),
        to: endOfDay(tempRange.to || tempRange.from),
      };
      setRange(confirmedRange);
      setIsOpen(false);
      onUpdate?.({ range: confirmedRange, rangeCompare });
    }
  };

  const handleClear = () => {
    const clearedRange: DateRange = { from: undefined, to: undefined };
    setTempRange(clearedRange);
    setRange(clearedRange);
    setSelectedPreset(undefined);
    onUpdate?.({ range: clearedRange, rangeCompare });
  };

  const handleCancel = () => {
    setTempRange({ from: range.from, to: range.to });
    setIsOpen(false);
  };

  // ─── Calendar Range Selection ──────────────────────────────────────────────

  const handleCalendarSelect = (selectedRange: { from?: Date; to?: Date } | undefined) => {
    if (!selectedRange) {
      setTempRange({ from: undefined, to: undefined });
      setSelectedPreset(undefined);
      return;
    }

    const newRange: DateRange = {
      from: selectedRange.from ? startOfDay(selectedRange.from) : undefined,
      to: selectedRange.to ? endOfDay(selectedRange.to) : undefined,
    };

    setTempRange(newRange);
    setSelectedPreset(undefined);
  };

  // ─── Direct Date Input Handlers ───────────────────────────────────────────

  const handleManualDateChange = (field: "from" | "to", val: string) => {
    if (field === "from") {
      setFromInputStr(val);
      if (val) {
        const parsed = getDateAdjustedForTimezone(val);
        if (isValid(parsed)) {
          const newFrom = startOfDay(parsed);
          setTempRange((prev) => ({
            from: newFrom,
            to: prev.to && prev.to >= newFrom ? prev.to : newFrom,
          }));
          setCalendarMonth(newFrom);
          setSelectedPreset(undefined);
        }
      } else {
        setTempRange((prev) => ({ ...prev, from: undefined }));
      }
    } else {
      setToInputStr(val);
      if (val) {
        const parsed = getDateAdjustedForTimezone(val);
        if (isValid(parsed)) {
          const newTo = endOfDay(parsed);
          setTempRange((prev) => ({
            from: prev.from || newTo,
            to: newTo,
          }));
          setCalendarMonth(newTo);
          setSelectedPreset(undefined);
        }
      } else {
        setTempRange((prev) => ({ ...prev, to: undefined }));
      }
    }
  };

  // ─── Fiscal Year Presets ───────────────────────────────────────────────────

  const applyFiscalPreset = (presetType: string) => {
    const fy = activeFY;
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (presetType) {
      case "full_fy":
        from = fy.startDate;
        to = fy.endDate;
        break;
      case "fy_ytd":
        from = fy.startDate;
        to = today >= fy.startDate && today <= fy.endDate ? endOfDay(today) : fy.endDate;
        break;
      case "q1":
        from = new Date(fy.startYear, 6, 1, 0, 0, 0, 0); // Jul 1
        to = new Date(fy.startYear, 8, 30, 23, 59, 59, 999); // Sep 30
        break;
      case "q2":
        from = new Date(fy.startYear, 9, 1, 0, 0, 0, 0); // Oct 1
        to = new Date(fy.startYear, 11, 31, 23, 59, 59, 999); // Dec 31
        break;
      case "q3":
        from = new Date(fy.endYear, 0, 1, 0, 0, 0, 0); // Jan 1
        to = new Date(fy.endYear, 2, 31, 23, 59, 59, 999); // Mar 31
        break;
      case "q4":
        from = new Date(fy.endYear, 3, 1, 0, 0, 0, 0); // Apr 1
        to = new Date(fy.endYear, 5, 30, 23, 59, 59, 999); // Jun 30
        break;
      case "h1":
        from = new Date(fy.startYear, 6, 1, 0, 0, 0, 0); // Jul 1
        to = new Date(fy.startYear, 11, 31, 23, 59, 59, 999); // Dec 31
        break;
      case "h2":
        from = new Date(fy.endYear, 0, 1, 0, 0, 0, 0); // Jan 1
        to = new Date(fy.endYear, 5, 30, 23, 59, 59, 999); // Jun 30
        break;
      default:
        return;
    }

    setTempRange({ from: startOfDay(from), to: endOfDay(to) });
    setCalendarMonth(from);
    setSelectedPreset(`fy_${presetType}`);
  };

  const applyFiscalMonth = (m: (typeof FISCAL_MONTHS)[0]) => {
    const year = m.isSecondHalf ? activeFY.endYear : activeFY.startYear;
    const from = new Date(year, m.monthIndex, 1, 0, 0, 0, 0);
    const to = new Date(year, m.monthIndex + 1, 0, 23, 59, 59, 999);

    setTempRange({ from: startOfDay(from), to: endOfDay(to) });
    setCalendarMonth(from);
    setSelectedPreset(`fy_m_${m.short}`);
  };

  // ─── Standard Calendar Presets ─────────────────────────────────────────────

  const applyStandardPreset = (presetName: string) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (presetName) {
      case "today":
        from = today;
        to = today;
        break;
      case "yesterday":
        from = subDays(today, 1);
        to = subDays(today, 1);
        break;
      case "thisWeek":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "last7Days":
        from = subDays(today, 6);
        to = today;
        break;
      case "thisMonth":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "lastMonth":
        from = startOfMonth(subDays(startOfMonth(today), 1));
        to = endOfMonth(subDays(startOfMonth(today), 1));
        break;
      case "last30Days":
        from = subDays(today, 29);
        to = today;
        break;
      case "last90Days":
        from = subDays(today, 89);
        to = today;
        break;
      case "fullCalendarYear":
        from = new Date(selectedCalendarYear, 0, 1, 0, 0, 0, 0);
        to = new Date(selectedCalendarYear, 11, 31, 23, 59, 59, 999);
        break;
      default:
        return;
    }

    setTempRange({ from: startOfDay(from), to: endOfDay(to) });
    setCalendarMonth(from);
    setSelectedPreset(presetName);
  };

  // ─── Label Helpers ─────────────────────────────────────────────────────────

  const formatDateRangeLabel = () => {
    if (!range.from && !range.to) {
      return placeholder;
    }
    if (range.from && range.to) {
      if (isSameDay(range.from, range.to)) {
        return format(range.from, "MMM d, yyyy");
      }
      return `${format(range.from, "MMM d, yyyy")} — ${format(range.to, "MMM d, yyyy")}`;
    }
    if (range.from) {
      return `${format(range.from, "MMM d, yyyy")} — ...`;
    }
    return placeholder;
  };

  const durationDays = useMemo(() => {
    if (tempRange.from && tempRange.to) {
      return differenceInDays(tempRange.to, tempRange.from) + 1;
    }
    return null;
  }, [tempRange]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 rounded-xl transition-all",
            (!range.from || !range.to) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary/80" />
          <span className="flex-1 truncate text-xs sm:text-sm font-medium">
            {formatDateRangeLabel()}
          </span>
          {isOpen ? (
            <ChevronUpIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          ) : (
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={8}
        style={{
          maxHeight: "calc(var(--radix-popover-content-available-height, 460px) - 16px)",
        }}
        className={cn(
          "w-auto p-0 flex flex-col shadow-2xl rounded-xl border border-border/80 bg-popover z-50 overflow-hidden outline-hidden"
        )}
        onEscapeKeyDown={handleCancel}
      >
        {/* ─── 1. COMPACT TOP HEADER: PRESET CATEGORIES & FY TOOLS ────────── */}
        {isPreset && (
          <div className="flex-shrink-0 border-b border-border/60 bg-muted/25 px-2.5 py-1.5 space-y-1.5">
            {/* Mode Switcher & Presets Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {/* Mode Toggle Pills */}
              <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setPresetTab("fiscal")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all",
                    presetTab === "fiscal"
                      ? "bg-background text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Building2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Fiscal Year</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTab("calendar")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all",
                    presetTab === "calendar"
                      ? "bg-background text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Quick</span>
                </button>
              </div>

              <div className="h-3.5 w-px bg-border/70 shrink-0" />

              {/* Fiscal Year Presets */}
              {presetTab === "fiscal" && (
                <div className="flex items-center gap-1 shrink-0">
                  <Select
                    value={selectedFyKey}
                    onValueChange={(key) => {
                      setSelectedFyKey(key);
                      const fy = availableFiscalYears.find((f) => f.key === key);
                      if (fy) {
                        setCalendarMonth(fy.startDate);
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 w-[95px] text-[11px] font-bold border-primary/30 text-primary bg-primary/5 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {availableFiscalYears.map((fy) => (
                        <SelectItem key={fy.key} value={fy.key} className="text-xs font-medium">
                          {fy.fullLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant={selectedPreset === "fy_full_fy" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-2 font-semibold"
                    onClick={() => applyFiscalPreset("full_fy")}
                  >
                    Full FY
                  </Button>
                  <Button
                    type="button"
                    variant={selectedPreset === "fy_fy_ytd" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-2 font-semibold"
                    onClick={() => applyFiscalPreset("fy_ytd")}
                  >
                    YTD
                  </Button>

                  {(["q1", "q2", "q3", "q4"] as const).map((q, idx) => (
                    <Button
                      key={q}
                      type="button"
                      variant={selectedPreset === `fy_${q}` ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[11px] px-1.5 font-medium"
                      onClick={() => applyFiscalPreset(q)}
                    >
                      {`Q${idx + 1}`}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant={selectedPreset === "fy_h1" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-1.5 font-medium"
                    onClick={() => applyFiscalPreset("h1")}
                  >
                    H1
                  </Button>
                  <Button
                    type="button"
                    variant={selectedPreset === "fy_h2" ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-1.5 font-medium"
                    onClick={() => applyFiscalPreset("h2")}
                  >
                    H2
                  </Button>
                </div>
              )}

              {/* Standard Calendar Presets */}
              {presetTab === "calendar" && (
                <div className="flex items-center gap-1 shrink-0">
                  <Select
                    value={selectedCalendarYear.toString()}
                    onValueChange={(y) => {
                      const yearNum = parseInt(y, 10);
                      setSelectedCalendarYear(yearNum);
                      const newDate = new Date(calendarMonth);
                      newDate.setFullYear(yearNum);
                      setCalendarMonth(newDate);
                    }}
                  >
                    <SelectTrigger className="h-6 w-[75px] text-[11px] font-semibold px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()} className="text-xs">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {[
                    { name: "today", label: "Today" },
                    { name: "yesterday", label: "Yesterday" },
                    { name: "thisWeek", label: "This Week" },
                    { name: "thisMonth", label: "This Month" },
                    { name: "lastMonth", label: "Last Month" },
                    { name: "last30Days", label: "Last 30D" },
                    { name: "fullCalendarYear", label: `Full ${selectedCalendarYear}` },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant={selectedPreset === preset.name ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[11px] px-2 font-medium"
                      onClick={() => applyStandardPreset(preset.name)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Fiscal Months Ribbon (only when Fiscal Year active) */}
            {presetTab === "fiscal" && (
              <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar pt-0.5">
                <span className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-wider mr-1 shrink-0">
                  Months:
                </span>
                {FISCAL_MONTHS.slice(0, 6).map((m) => (
                  <button
                    key={m.short}
                    type="button"
                    onClick={() => applyFiscalMonth(m)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10.5px] font-medium transition-all shrink-0 border",
                      selectedPreset === `fy_m_${m.short}`
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "border-border/50 hover:bg-accent text-foreground/80 hover:text-foreground"
                    )}
                  >
                    {m.short}
                  </button>
                ))}
                <div className="h-3 w-px bg-border/80 mx-1 shrink-0" />
                {FISCAL_MONTHS.slice(6, 12).map((m) => (
                  <button
                    key={m.short}
                    type="button"
                    onClick={() => applyFiscalMonth(m)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10.5px] font-medium transition-all shrink-0 border",
                      selectedPreset === `fy_m_${m.short}`
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "border-border/50 hover:bg-accent text-foreground/80 hover:text-foreground"
                    )}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 2. SCROLLABLE MIDDLE CONTAINER: INPUTS & CALENDAR ─────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Combined Direct Date Inputs & Jump Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1 bg-muted/30 rounded-lg border border-border/50 text-xs">
            {/* Left: From / To Inputs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                From
              </span>
              <input
                type="date"
                value={fromInputStr}
                onChange={(e) => handleManualDateChange("from", e.target.value)}
                className="h-6 w-[112px] px-1.5 rounded border border-input bg-background text-[11px] font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              />
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                To
              </span>
              <input
                type="date"
                value={toInputStr}
                onChange={(e) => handleManualDateChange("to", e.target.value)}
                className="h-6 w-[112px] px-1.5 rounded border border-input bg-background text-[11px] font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {durationDays !== null && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                  {durationDays}d
                </span>
              )}
            </div>

            {/* Right: Quick Jump */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">Jump:</span>
              <Select
                value={calendarMonth.getMonth().toString()}
                onValueChange={(val) => {
                  const m = parseInt(val, 10);
                  const updated = new Date(calendarMonth);
                  updated.setMonth(m);
                  setCalendarMonth(updated);
                }}
              >
                <SelectTrigger className="h-6 w-[88px] text-[11px] font-medium bg-background px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {CALENDAR_MONTHS.map((name, idx) => (
                    <SelectItem key={idx} value={idx.toString()} className="text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={calendarMonth.getFullYear().toString()}
                onValueChange={(val) => {
                  const y = parseInt(val, 10);
                  const updated = new Date(calendarMonth);
                  updated.setFullYear(y);
                  setCalendarMonth(updated);
                }}
              >
                <SelectTrigger className="h-6 w-[70px] text-[11px] font-medium bg-background px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-xs">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10.5px] text-muted-foreground hover:text-foreground px-1.5"
                onClick={() => setCalendarMonth(new Date())}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Interactive Calendar Component */}
          <div className="flex justify-center border rounded-lg p-0.5 bg-background/50 shadow-2xs">
            <Calendar
              mode="range"
              selected={{
                from: tempRange.from,
                to: tempRange.to,
              }}
              onSelect={handleCalendarSelect}
              numberOfMonths={isSmallScreen ? 1 : 2}
              fromYear={dateRange?.oldestDate ? new Date(dateRange.oldestDate).getFullYear() : 1970}
              toYear={dateRange?.latestDate ? new Date(dateRange.latestDate).getFullYear() : new Date().getFullYear() + 10}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              className="p-1 [--cell-size:26px] sm:[--cell-size:28px]"
              classNames={{
                months: "flex gap-3 flex-col sm:flex-row relative",
                month: "flex flex-col gap-0.5",
                month_caption: "flex items-center justify-center h-6 text-xs font-semibold",
                nav: "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between z-10 pointer-events-none",
                button_previous: "size-6 p-0",
                button_next: "size-6 p-0",
                weekdays: "flex text-[10.5px]",
                weekday: "text-muted-foreground/70 rounded-md flex-1 font-medium text-[0.68rem] text-center select-none py-0",
                week: "flex w-full mt-0.5",
                day: "relative w-full h-full p-0 text-center text-xs group/day aspect-square select-none",
              }}
              disabled={(date) => {
                if (dateRange?.oldestDate && date < new Date(dateRange.oldestDate)) return true;
                if (dateRange?.latestDate && date > new Date(dateRange.latestDate)) return true;

                for (const disabledRange of disabledDateRanges) {
                  const from = new Date(disabledRange.from);
                  const to = new Date(disabledRange.to);
                  from.setHours(0, 0, 0, 0);
                  to.setHours(23, 59, 59, 999);
                  if (date >= from && date <= to) return true;
                }
                return false;
              }}
            />
          </div>
        </div>

        {/* ─── 3. STICKY ACTION FOOTER (ALWAYS VISIBLE & ACCESSIBLE) ──── */}
        <div className="flex-shrink-0 border-t border-border/80 bg-muted/40 backdrop-blur-xs px-2.5 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Selected Range Summary */}
          <div className="flex items-center gap-1.5 text-xs">
            {tempRange.from ? (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-bold text-foreground text-xs">
                  {format(tempRange.from, "MMM d, yyyy")}
                </span>
                <span className="text-muted-foreground font-medium">—</span>
                <span className="font-bold text-foreground text-xs">
                  {tempRange.to ? (
                    format(tempRange.to, "MMM d, yyyy")
                  ) : (
                    <span className="italic text-muted-foreground font-normal">Select end date...</span>
                  )}
                </span>
                {durationDays !== null && (
                  <span className="ml-1 text-[10.5px] text-muted-foreground font-medium">
                    ({durationDays} {durationDays === 1 ? "day" : "days"})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">No dates selected</span>
            )}
          </div>

          {/* Action Buttons: Clear, Cancel, Done */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              type="button"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-7 text-xs font-medium px-2.5"
              type="button"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!tempRange.from}
              className="h-7 text-xs font-bold px-3.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              type="button"
            >
              <Check className="h-3 w-3 mr-1" />
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.displayName = "DateRangePicker";
DateRangePicker.filePath = "components/ui/date-range-picker.tsx";
export default DateRangePicker;
