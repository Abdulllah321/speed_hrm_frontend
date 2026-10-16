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
  popoverClassName?: string
  isLoading?: boolean
  onCreate?: (value: string) => void
  allowClear?: boolean
}

// Marquee text — infinite loop on hover, only when content overflows
function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const textRef = React.useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = React.useState(0)
  const [hovered, setHovered] = React.useState(false)

  React.useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return
    const diff = textEl.scrollWidth - container.clientWidth
    setOverflow(diff > 0 ? diff : 0)
  }, [text])

  const isAnimating = hovered && overflow > 0
  // gap between end of text and start of duplicate (px)
  const gap = 48
  const totalShift = overflow + gap

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden min-w-0 flex-1", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        ref={textRef}
        style={isAnimating ? ({
          '--marquee-shift': `-${totalShift}px`,
          '--marquee-duration': `${Math.max(2, totalShift / 60)}s`,
        } as React.CSSProperties) : undefined}
        className={cn(
          "inline-block whitespace-nowrap",
          isAnimating && "animate-marquee-loop"
        )}
      >
        {text}
        {/* Duplicate for seamless loop — only rendered when animating */}
        {isAnimating && (
          <span style={{ paddingLeft: gap }}>{text}</span>
        )}
      </span>
    </div>
  )
}

/**
 * Normalizes text for flexible searching:
 * - Lowercase
 * - Replaces delimiters (-, _, /, \, ., ,, :, etc.) with spaces
 * - Collapses consecutive spaces
 */
export function normalizeForSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Strips all non-alphanumeric characters for compact search:
 * e.g. "NIKE-XINHUA MALL" -> "nikexinhuamall"
 */
export function compactForSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Flexible matching algorithm:
 * Matches if any of the following are true:
 * 1. Raw case-insensitive substring
 * 2. Compact string match (ignoring dashes, spaces, and punctuation)
 * 3. Token-based word match (all search words present in target, in any order)
 */
export function matchesAutocompleteSearch(option: AutocompleteOption, rawSearch: string): boolean {
  if (!rawSearch || !rawSearch.trim()) return true

  const rawSearchLower = rawSearch.trim().toLowerCase()
  const rawHaystack = [option.value, option.label, option.description || ''].join(' ').toLowerCase()

  // 1. Direct raw substring match
  if (rawHaystack.includes(rawSearchLower)) {
    return true
  }

  // 2. Compact match (strips out all spaces, hyphens, punctuation)
  // e.g. "nike xinhua mall" matches "NIKE-XINHUA MALL" or "nikexinhua"
  const compactHaystack = compactForSearch(rawHaystack)
  const compactSearch = compactForSearch(rawSearch)
  if (compactSearch.length > 0 && compactHaystack.includes(compactSearch)) {
    return true
  }

  // 3. Normalized tokens match (word-by-word agnostic, order-independent)
  // e.g. "xinhua nike" or "nike xinhua mall"
  const normalizedHaystack = normalizeForSearch(rawHaystack)
  const searchTokens = normalizeForSearch(rawSearch).split(' ').filter(Boolean)

  if (searchTokens.length > 0 && searchTokens.every((token) => normalizedHaystack.includes(token))) {
    return true
  }

  return false
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
  popoverClassName,
  isLoading = false,
  onCreate,
  allowClear = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(
    () =>
      search.trim().length === 0
        ? options
        : options.filter((option) => matchesAutocompleteSearch(option, search)),
    [options, search]
  )

  React.useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const handleCreate = () => {
    if (onCreate && search) {
      onCreate(search)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Wrapper div breaks out of button's overflow-hidden so chevron is never clipped */}
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          tabIndex={disabled || isLoading ? -1 : 0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } }}
          title={selectedOption ? selectedOption.label : undefined}
          className={cn(
            "flex items-center w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-normal cursor-pointer select-none",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            open && "ring-2 ring-ring/20 border-primary",
            (disabled || isLoading) && "pointer-events-none opacity-50",
            className
          )}
        >
          {/* Label area — takes all available space, chevron stays fixed right */}
          <div className="flex-1 min-w-0 overflow-hidden mr-2">
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Loading...
              </span>
            ) : selectedOption ? (
              <MarqueeText text={selectedOption.label} className="font-semibold text-gray-900" />
            ) : value && options.length === 0 ? (
              <span className="text-muted-foreground">Loading options...</span>
            ) : (
              <span className="text-muted-foreground truncate block">{placeholder}</span>
            )}
          </div>

          {/* Chevron — always visible, never clipped */}
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[340px] sm:min-w-[440px] max-w-[95vw] p-0 shadow-2xl border rounded-lg bg-popover",
          popoverClassName
        )}
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-lg" shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            disabled={isLoading}
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredOptions.length > 0) {
                e.preventDefault()
                e.stopPropagation()
                const target = filteredOptions[0]
                onValueChange?.(target.value)
                setOpen(false)
              }
            }}
          />
          <CommandList className="max-h-[320px]">
            <div className={cn("max-h-[320px]", filteredOptions.length <= 5 ? "h-fit" : "h-[320px]")}>
              <ScrollArea showShadows={true} shadowSize="md" className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty className="py-4 text-center text-sm text-muted-foreground px-3">
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
                    <CommandGroup className="p-1.5">
                      {filteredOptions.map((option) => {
                        const isSelected = value === option.value
                        return (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              onValueChange?.(allowClear && isSelected ? "" : option.value)
                              setOpen(false)
                            }}
                            className={cn(
                              "flex items-center justify-between gap-3 px-3 py-2.5 my-0.5 rounded-md cursor-pointer transition-colors",
                              isSelected ? "bg-indigo-50 text-indigo-900 font-semibold" : "hover:bg-accent text-gray-800"
                            )}
                          >
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span
                                className={cn(
                                  "text-sm leading-snug break-words",
                                  isSelected ? "font-bold text-indigo-700" : "font-medium"
                                )}
                              >
                                {option.label}
                              </span>
                              {option.description && (
                                <span className="text-xs text-muted-foreground break-words">
                                  {option.description}
                                </span>
                              )}
                            </div>
                            {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600 font-bold" />}
                          </CommandItem>
                        )
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
