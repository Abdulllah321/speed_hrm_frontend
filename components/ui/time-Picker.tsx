"use client";

import * as React from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function TimePicker({ value, onChange, disabled, className, placeholder }: { value?: string; onChange?: (value: string) => void; disabled?: boolean; className?: string; placeholder?: string }) {
  const [time, setTime] = React.useState<Date | undefined>(value ? new Date(`2000-01-01T${value}`) : undefined);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (value && value.trim() !== '') {
      try {
        setTime(new Date(`2000-01-01T${value}`));
      } catch (e) {
        setTime(undefined);
      }
    } else {
      setTime(undefined);
    }
  }, [value]);

  const handleTimeChange = (type: "hour" | "minute" | "ampm", val: string) => {
    const currentTime = time || new Date("2000-01-01T00:00:00");
    let newTime = new Date(currentTime);
    const currentHour = newTime.getHours();
    const isPM = currentHour >= 12;

    if (type === "hour") {
      const hour = parseInt(val, 10);
      if (isPM) {
        newTime.setHours(hour === 12 ? 12 : hour + 12);
      } else {
        newTime.setHours(hour === 12 ? 0 : hour);
      }
    } else if (type === "minute") {
      newTime.setMinutes(parseInt(val, 10));
    } else if (type === "ampm") {
      const hours = newTime.getHours();
      if (val === "AM" && hours >= 12) {
        newTime.setHours(hours - 12);
      } else if (val === "PM" && hours < 12) {
        newTime.setHours(hours + 12);
      }
    }

    setTime(newTime);
    const timeString = format(newTime, "HH:mm");
    if (onChange) onChange(timeString);
  };

  const displayValue = time ? format(time, "hh:mm aa") : (placeholder || "Select time");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !time && "text-muted-foreground", className)}
          disabled={disabled}
          type="button"
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {Array.from({ length: 12 }, (_, i) => i + 1)
                .reverse()
                .map((hour) => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={
                      time &&
                      time.getHours() % 12 === hour % 12
                        ? "default"
                        : "ghost"
                    }
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange("hour", hour.toString())}
                  >
                    {hour}
                  </Button>
                ))}
            </div>
            <ScrollBar
              orientation="horizontal"
              className="sm:hidden"
            />
          </ScrollArea>
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {Array.from({ length: 12 }, (_, i) => i * 5).map(
                (minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={
                      time &&
                      time.getMinutes() === minute
                        ? "default"
                        : "ghost"
                    }
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() =>
                      handleTimeChange("minute", minute.toString())
                    }
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                )
              )}
            </div>
            <ScrollBar
              orientation="horizontal"
              className="sm:hidden"
            />
          </ScrollArea>
          <ScrollArea className="">
            <div className="flex sm:flex-col p-2">
              {["AM", "PM"].map((ampm) => (
                <Button
                  key={ampm}
                  size="icon"
                  variant={
                    time &&
                    ((ampm === "AM" &&
                      time.getHours() < 12) ||
                      (ampm === "PM" &&
                        time.getHours() >= 12))
                      ? "default"
                      : "ghost"
                  }
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange("ampm", ampm)}
                >
                  {ampm}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
