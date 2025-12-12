"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  isLoading?: boolean
}

export function Autocomplete({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  isLoading = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)
  
  // Debug: Log if value doesn't match any option
  React.useEffect(() => {
    if (value && !selectedOption && options.length > 0) {
      console.warn(`Autocomplete: Value "${value}" not found in options. Available options:`, options.map(o => o.value));
    }
  }, [value, selectedOption, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-input/30",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <span className="text-muted-foreground">Loading...</span>
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            </>
          ) : (
            <>
              {selectedOption ? (
                selectedOption.label
              ) : value && options.length === 0 ? (
                <span className="text-muted-foreground">Loading options...</span>
              ) : (
                placeholder
              )}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} disabled={isLoading} />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={(selectedLabel) => {
                          // Find the option that matches the selected label
                          const selectedOption = options.find(
                            (opt) => opt.label === selectedLabel
                          );
                          if (selectedOption) {
                            const newValue = isSelected ? "" : selectedOption.value;
                            onValueChange?.(newValue);
                            setOpen(false);
                          }
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

