"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Tag, Check, Minus } from "lucide-react";
import { Location } from "@/lib/actions/location";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BrandInfo {
  id: string;
  name: string;
  locationIds: string[];
}

export function LocationMultiSelect({
  locations,
  selected,
  onChange,
  disabled,
  maxHeight = "calc(100vh - 18rem)",
  stockOnly = true,
}: {
  locations: Location[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  maxHeight?: string;
  stockOnly?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = React.useState<string | null>(null);

  // 1. Only stock locations (when stockOnly is true)
  const baseLocations = useMemo(() => {
    if (!stockOnly) return locations;
    return locations.filter((loc) => loc.isStockLocation !== false);
  }, [locations, stockOnly]);

  // 2. Extract unique brands with their associated location IDs
  const brands = useMemo<BrandInfo[]>(() => {
    const map = new Map<string, BrandInfo>();
    baseLocations.forEach((loc) => {
      (loc.brands || []).forEach((b) => {
        if (!b || !b.id) return;
        const existing = map.get(b.id);
        if (existing) {
          if (!existing.locationIds.includes(loc.id)) {
            existing.locationIds.push(loc.id);
          }
        } else {
          map.set(b.id, {
            id: b.id,
            name: b.name,
            locationIds: [loc.id],
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [baseLocations]);

  // 3. Search filter matching name, shortCode, and code
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return baseLocations.filter((loc) => {
      // Optional brand view filter
      if (selectedBrandFilter) {
        const belongsToBrand = loc.brands?.some((b) => b.id === selectedBrandFilter);
        if (!belongsToBrand) return false;
      }

      if (!query) return true;
      const nameMatch = loc.name.toLowerCase().includes(query);
      const shortCodeMatch = loc.shortCode ? loc.shortCode.toLowerCase().includes(query) : false;
      const codeMatch = loc.code ? loc.code.toLowerCase().includes(query) : false;
      return nameMatch || shortCodeMatch || codeMatch;
    });
  }, [baseLocations, search, selectedBrandFilter]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const isAllSelected =
    filtered.length > 0 && filtered.every((l) => selected.includes(l.id));

  const toggleAll = () => {
    if (isAllSelected) {
      onChange(selected.filter((id) => !filtered.some((l) => l.id === id)));
    } else {
      const newIds = filtered
        .map((l) => l.id)
        .filter((id) => !selected.includes(id));
      onChange([...selected, ...newIds]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  // Toggle all locations belonging to a specific brand
  const handleToggleBrand = (brand: BrandInfo) => {
    if (disabled) return;
    const allSelected = brand.locationIds.every((id) => selected.includes(id));

    if (allSelected) {
      // Deselect all locations belonging to this brand
      onChange(selected.filter((id) => !brand.locationIds.includes(id)));
    } else {
      // Select all locations belonging to this brand (preserving existing selections)
      const newIds = brand.locationIds.filter((id) => !selected.includes(id));
      onChange([...selected, ...newIds]);
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3 border-b space-y-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Search store name, short code (e.g. KHI-01)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Brand-Based Multi-Selection */}
        {brands.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" /> Select by Brand
              </span>
              <span className="text-[10px]">Click brand to toggle its stores</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {brands.map((b) => {
                const selectedCount = b.locationIds.filter((id) => selected.includes(id)).length;
                const isAllBrandSelected = selectedCount === b.locationIds.length && b.locationIds.length > 0;
                const isPartiallySelected = selectedCount > 0 && !isAllBrandSelected;

                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleBrand(b)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border select-none",
                      isAllBrandSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                        : isPartiallySelected
                        ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    title={`${b.name} (${selectedCount}/${b.locationIds.length} stores selected)`}
                  >
                    {isAllBrandSelected ? (
                      <Check className="h-3 w-3 shrink-0 stroke-[2.5]" />
                    ) : isPartiallySelected ? (
                      <Minus className="h-3 w-3 shrink-0 stroke-[2.5]" />
                    ) : null}
                    <span>{b.name}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1 py-0.2 rounded font-mono",
                        isAllBrandSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background/80 text-muted-foreground"
                      )}
                    >
                      {selectedCount}/{b.locationIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection summary */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <span className="text-muted-foreground text-[11px]">
            {selected.length > 0 ? (
              <span className="font-semibold text-foreground">
                {selected.length}
              </span>
            ) : (
              "0"
            )}{" "}
            of {baseLocations.length} stores selected
          </span>
          <div className="flex gap-1">
            {selected.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={clearAll}
                disabled={disabled}
              >
                Clear All
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={toggleAll}
              disabled={disabled || filtered.length === 0}
            >
              {isAllSelected ? "Deselect Filtered" : "Select Filtered"}
            </Button>
          </div>
        </div>
      </div>

      {/* Location list */}
      <ScrollArea style={{ height: maxHeight }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No stock locations found</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((loc) => {
              const isSelected = selected.includes(loc.id);
              const displayCode = loc.shortCode || loc.code;
              return (
                <div
                  key={loc.id}
                  onClick={() => toggle(loc.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors",
                    "cursor-pointer select-none",
                    disabled && "opacity-50 cursor-not-allowed",
                    !disabled && "hover:bg-muted/70",
                    isSelected && "bg-muted/60",
                  )}
                >
                  <div
                    className={cn(
                      "size-4 shrink-0 rounded-[4px] border shadow-xs transition-all duration-200 ease-in-out flex items-center justify-center",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-input/80 border-input dark:bg-input/30",
                      disabled && "opacity-50",
                    )}
                  >
                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-3.5 block shrink-0 animate-check-in"
                      >
                        <path
                          d="M3 7L6 10L11 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          strokeDasharray="16"
                          strokeDashoffset="0"
                          className="animate-check-draw"
                        />
                      </svg>
                    )}
                  </div>
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{loc.name}</p>
                    {loc.brands && loc.brands.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {loc.brands.map((b) => b.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono shrink-0 font-semibold bg-background"
                  >
                    {displayCode}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
