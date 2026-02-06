"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, Loader2 } from "lucide-react"

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
import { ScrollArea } from "./scroll-area"

export interface AutocompleteOption {
  value: string
  label: string
  description?: string
}

export interface AutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: React.ReactNode
  disabled?: boolean
  className?: string
  isLoading?: boolean
  onCreate?: (value: string) => void
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
  onCreate,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)

  const normalizedSearch = search.trim().toLowerCase()

  const filteredOptions = React.useMemo(
    () =>
      normalizedSearch.length === 0
        ? options
        : options.filter((option) => {
          const haystack = [
            option.value,
            option.label,
            option.description || "",
          ]
            .join(" ")
            .toLowerCase()
          return haystack.includes(normalizedSearch)
        }),
    [options, normalizedSearch]
  )

  React.useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  const handleCreate = () => {
    if (onCreate && search) {
      onCreate(search);
      setOpen(false);
    }
  }

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
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[280px]">
            <div className={cn(
              "max-h-[280px]",
              options.length <= 5 ? "h-fit" : "h-[280px]"
            )}>
              <ScrollArea showShadows={true} shadowSize="md" className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty className="py-2 text-center text-sm text-muted-foreground px-2">
                      {filteredOptions.length === 0 && onCreate && search ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-auto py-2 px-2 text-primary"
                          onClick={handleCreate}
                        >
                          <span className="truncate">Create "{search}"</span>
                        </Button>
                      ) : (
                        emptyMessage
                      )}
                    </CommandEmpty>
                    <CommandGroup className="p-1">
                      {filteredOptions.map((option) => {
                        const isSelected = value === option.value;
                        const searchValue = [
                          option.value,
                          option.label,
                          option.description || ""
                        ].join(" ");
                        return (
                          <CommandItem
                            key={option.value}
                            value={searchValue}
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
              </ScrollArea>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

