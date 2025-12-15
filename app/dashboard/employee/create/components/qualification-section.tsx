"use client";

import { useState, useEffect } from "react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { createQualification } from "@/lib/actions/qualification";
import { createInstitute } from "@/lib/actions/institute";
import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Option = { id: string; name: string };

export function QualificationSection({
  form,
  isPending,
  loadingData,
  qualifications,
  institutes,
  countries,
  states,
  cities,
  errors,
  onQualificationAdded,
  onInstituteAdded,
}: {
  form: UseFormReturn<any>;
  isPending: boolean;
  loadingData: boolean;
  qualifications: Option[];
  institutes: Option[];
  countries: Option[];
  states: Option[];
  cities: { id: string; name: string; stateId?: string }[];
  errors: Record<string, { message?: string }>;
  onQualificationAdded?: (qualification: { id: string; name: string }) => void;
  onInstituteAdded?: (institute: { id: string; name: string }) => void;
}) {
  const { control, watch } = form;

  // Creating states
  const [isCreatingQualification, setIsCreatingQualification] = useState(false);
  const [isCreatingInstitute, setIsCreatingInstitute] = useState(false);

  // Dynamic cities loading based on state
  const [qualificationCities, setQualificationCities] = useState<{ id: string; name: string }[]>([]);
  const [loadingQualificationCities, setLoadingQualificationCities] = useState(false);

  // Watch for state changes to load cities
  const qualificationState = watch("qualifications.0.stateId");

  // Fetch cities when state changes (same as Basic Info section)
  useEffect(() => {
    const fetchCities = async () => {
      if (!qualificationState) {
        setQualificationCities([]);
        form.setValue("qualifications.0.cityId", "");
        setLoadingQualificationCities(false);
        return;
      }

      try {
        setLoadingQualificationCities(true);
        const res = await fetch(`/api/data/cities/${qualificationState}`, { cache: "no-store" });
        const json = await res.json();
        if (json.status) {
          setQualificationCities(json.data || []);
        } else {
          toast.error(json.message || "Failed to load cities");
          setQualificationCities([]);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
        toast.error("Failed to load cities");
        setQualificationCities([]);
      } finally {
        setLoadingQualificationCities(false);
      }
    };

    const timer = setTimeout(fetchCities, 250);
    return () => clearTimeout(timer);
  }, [qualificationState, form]);

  // Handle create qualification from search
  const handleCreateQualification = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;

    try {
      setIsCreatingQualification(true);
      const result = await createQualification({ name: name.trim(), status: "active" });
      
      if (result.status && result.data) {
        const newQualification = { id: result.data.id, name: result.data.name };
        form.setValue("qualifications.0.qualification", newQualification.id);
        toast.success("Qualification added successfully");
        onQualificationAdded?.(newQualification);
        return newQualification.id;
      } else {
        toast.error(result.message || "Failed to add qualification");
        return null;
      }
    } catch (error) {
      toast.error("Failed to add qualification");
      console.error("Error creating qualification:", error);
      return null;
    } finally {
      setIsCreatingQualification(false);
    }
  };

  // Handle create institute from search
  const handleCreateInstitute = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;

    try {
      setIsCreatingInstitute(true);
      const result = await createInstitute({ name: name.trim(), status: "active" });
      
      if (result.status && result.data) {
        const newInstitute = { id: result.data.id, name: result.data.name };
        form.setValue("qualifications.0.instituteId", newInstitute.id);
        toast.success("Institute added successfully");
        onInstituteAdded?.(newInstitute);
        return newInstitute.id;
      } else {
        toast.error(result.message || "Failed to add institute");
        return null;
      }
    } catch (error) {
      toast.error("Failed to add institute");
      console.error("Error creating institute:", error);
      return null;
    } finally {
      setIsCreatingInstitute(false);
    }
  };

  // Custom Autocomplete with create-on-search
  const CreateableAutocomplete = ({
    options,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled,
    onCreateNew,
    isCreating,
  }: {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    onCreateNew?: (name: string) => Promise<string | null>;
    isCreating?: boolean;
  }) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );
    const showCreateOption = searchValue.trim() && 
      !filteredOptions.some(opt => opt.label.toLowerCase() === searchValue.toLowerCase().trim());

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between bg-input/30",
              !selectedOption && "text-muted-foreground"
            )}
            disabled={disabled || isCreating}
          >
            {isCreating ? (
              <>
                <span className="text-muted-foreground">Creating...</span>
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
              </>
            ) : (
              <>
                {selectedOption ? selectedOption.label : placeholder}
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={searchPlaceholder} 
              disabled={disabled || isCreating}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isCreating ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Creating...</span>
                </div>
              ) : (
                <>
                  {filteredOptions.length === 0 && !showCreateOption && (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  )}
                  <CommandGroup>
                    {filteredOptions.map((option) => {
                      const isSelected = value === option.value;
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => {
                            const newValue = isSelected ? "" : option.value;
                            onValueChange?.(newValue);
                            setOpen(false);
                            setSearchValue("");
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
                    {showCreateOption && onCreateNew && (
                      <CommandItem
                        value={`Create "${searchValue.trim()}"`}
                        onSelect={async () => {
                          const newId = await onCreateNew(searchValue.trim());
                          if (newId) {
                            onValueChange?.(newId);
                            setOpen(false);
                            setSearchValue("");
                          }
                        }}
                        className="text-primary"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create &quot;{searchValue.trim()}&quot;
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-lg font-bold text-muted-foreground border-b border-muted-foreground pb-2">
        Qualification
      </div>

      <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Qualification <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="qualifications.0.qualification"
              control={control}
              render={({ field }) => (
                <CreateableAutocomplete
                  options={qualifications.map((q) => ({
                    value: q.id,
                    label: q.name,
                  }))}
                  value={field.value as string | undefined}
                  onValueChange={field.onChange}
                  placeholder="Select or create Qualification"
                  searchPlaceholder="Search or create qualification..."
                  emptyMessage="No qualifications found"
                  disabled={isPending || loadingData}
                  onCreateNew={handleCreateQualification}
                  isCreating={isCreatingQualification}
                />
              )}
            />
            {(errors?.qualifications as any)?.[0]?.qualification && (
              <p className="text-xs text-red-500">
                {(errors.qualifications as any)[0].qualification.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Institute</Label>
            <Controller
              name="qualifications.0.instituteId"
              control={control}
              render={({ field }) => (
                <CreateableAutocomplete
                  options={institutes.map((i) => ({
                    value: i.id,
                    label: i.name,
                  }))}
                  value={field.value as string | undefined}
                  onValueChange={field.onChange}
                  placeholder="Select or create Institute"
                  searchPlaceholder="Search or create institute..."
                  emptyMessage="No institutes found"
                  disabled={isPending || loadingData}
                  onCreateNew={handleCreateInstitute}
                  isCreating={isCreatingInstitute}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Controller
              name="qualifications.0.year"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  placeholder="e.g., 2020"
                  value={field.value || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? parseInt(val) : "");
                  }}
                  min="1900"
                  max={new Date().getFullYear()}
                  disabled={isPending}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Grade</Label>
            <Controller
              name="qualifications.0.grade"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="e.g., A+, First Division"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Controller
              name="qualifications.0.countryId"
              control={control}
              render={({ field }) => {
                // Filter to show only Pakistan
                const pakistanOnly = countries.filter((c) => 
                  c.name.toLowerCase() === "pakistan"
                );
                
                return (
                  <Autocomplete
                    options={pakistanOnly.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={field.value as string | undefined}
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Reset state and city when country changes
                      form.setValue("qualifications.0.stateId", "");
                      form.setValue("qualifications.0.cityId", "");
                    }}
                    placeholder="Select Country"
                    disabled={isPending || loadingData}
                  />
                );
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Controller
              name="qualifications.0.stateId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={states.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  value={field.value as string | undefined}
                  onValueChange={(val) => {
                    field.onChange(val);
                    // Reset city when state changes
                    form.setValue("qualifications.0.cityId", "");
                  }}
                  placeholder="Select State"
                  disabled={isPending || loadingData}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>City</Label>
            <Controller
              name="qualifications.0.cityId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={qualificationCities.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={field.value as string | undefined}
                  onValueChange={field.onChange}
                  placeholder={
                    qualificationState
                      ? "Select City"
                      : "Select State first"
                  }
                  disabled={
                    isPending ||
                    !qualificationState ||
                    loadingData ||
                    loadingQualificationCities
                  }
                  isLoading={loadingQualificationCities}
                  emptyMessage="No cities available"
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

