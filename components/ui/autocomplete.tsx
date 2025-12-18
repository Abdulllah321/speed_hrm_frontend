"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, Loader2, SearchIcon } from "lucide-react"

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
  description?: string
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedOption && "text-muted-foreground",
            open && "ring-2 ring-ring/20",
            className
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </span>
          ) : selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : value && options.length === 0 ? (
            <span>Loading options...</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDownIcon className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-lg">
          <CommandInput 
            placeholder={searchPlaceholder} 
            disabled={isLoading}
          />
          <CommandList className="max-h-[280px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <>
                <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup className="p-1">
                  {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <CommandItem
                        key={option.value}
                        value={`${option.value} ${option.label}`}
                        onSelect={() => {
                          const newValue = isSelected ? "" : option.value;
                          onValueChange?.(newValue);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer",
                          isSelected && "bg-accent"
                        )}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={cn(
                            "truncate",
                            isSelected && "font-medium"
                          )}>
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {option.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                        )}
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

