"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { createQualification, createQualificationsBulk } from "@/lib/actions/qualification";
import { Institute } from "@/lib/actions/institute";
import { getCountries, getStatesByCountry, getCitiesByState, Country, State, City } from "@/lib/actions/city";

interface QualificationAddFormProps {
  institutes: Institute[];
}

// Zod schema for qualification validation
const qualificationSchema = z.object({
  instituteId: z.string().min(1, { message: "Institute is required" }),
  qualification: z.string().min(1, { message: "Qualification is required" }).trim(),
  countryId: z.string().min(1, { message: "Country is required" }),
  stateId: z.string().min(1, { message: "State is required" }),
  cityId: z.string().min(1, { message: "City is required" }),
});

const formSchema = z.object({
  qualifications: z
    .array(qualificationSchema)
    .min(1, { message: "At least one qualification is required" }),
});

type QualificationFormValues = z.infer<typeof formSchema>;

export function QualificationAddForm({ institutes }: QualificationAddFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [statesMap, setStatesMap] = useState<Map<string, State[]>>(new Map());
  const [citiesMap, setCitiesMap] = useState<Map<string, City[]>>(new Map());
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [loadingCities, setLoadingCities] = useState<Map<string, boolean>>(new Map());

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const result = await getCountries();
        if (result.status && result.data) {
          setCountries(result.data);
        }
      } catch (error) {
        console.error("Error loading countries:", error);
        toast.error("Failed to load countries");
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, []);

  const form = useForm<QualificationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      qualifications: [
        {
          instituteId: "",
          qualification: "",
          countryId: "",
          stateId: "",
          cityId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "qualifications",
  });

  const instituteOptions: AutocompleteOption[] = institutes.map((institute) => ({
    value: institute.id,
    label: institute.name,
  }));

  const countryOptions: AutocompleteOption[] = countries.map((country) => ({
    value: country.id,
    label: country.nicename || country.name,
  }));

  // Load states when country changes
  const handleCountryChange = async (index: number, countryId: string) => {
    form.setValue(`qualifications.${index}.countryId`, countryId);
    form.setValue(`qualifications.${index}.stateId`, "");
    form.setValue(`qualifications.${index}.cityId`, "");
    
    if (!countryId) {
      return;
    }

    // Check if states are already loaded
    if (statesMap.has(countryId)) {
      return;
    }

    // Set loading state
    setLoadingStates(prev => new Map(prev).set(countryId, true));

    try {
      const result = await getStatesByCountry(countryId);
      if (result.status && result.data) {
        setStatesMap(prev => new Map(prev).set(countryId, result.data!));
      }
    } catch (error) {
      console.error("Error loading states:", error);
      toast.error("Failed to load states");
    } finally {
      setLoadingStates(prev => new Map(prev).set(countryId, false));
    }
  };

  // Load cities when state changes
  const handleStateChange = async (index: number, stateId: string) => {
    form.setValue(`qualifications.${index}.stateId`, stateId);
    form.setValue(`qualifications.${index}.cityId`, "");
    
    if (!stateId) {
      return;
    }

    // Check if cities are already loaded
    if (citiesMap.has(stateId)) {
      return;
    }

    // Set loading state
    setLoadingCities(prev => new Map(prev).set(stateId, true));

    try {
      const result = await getCitiesByState(stateId);
      if (result.status && result.data) {
        setCitiesMap(prev => new Map(prev).set(stateId, result.data!));
      }
    } catch (error) {
      console.error("Error loading cities:", error);
      toast.error("Failed to load cities");
    } finally {
      setLoadingCities(prev => new Map(prev).set(stateId, false));
    }
  };

  const getStateOptions = (countryId: string): AutocompleteOption[] => {
    const states = statesMap.get(countryId) || [];
    return states.map((state) => ({
      value: state.id,
      label: state.name,
    }));
  };

  const getCityOptions = (stateId: string): AutocompleteOption[] => {
    const cities = citiesMap.get(stateId) || [];
    return cities.map((city) => ({
      value: city.id,
      label: city.name,
    }));
  };

  const onSubmit = async (data: QualificationFormValues) => {
    startTransition(async () => {
      try {
        const qualificationsToCreate = data.qualifications.map((qual) => {
          const selectedInstitute = institutes.find((inst) => inst.id === qual.instituteId);
          const selectedCountry = countries.find((c) => c.id === qual.countryId);
          const selectedState = statesMap.get(qual.countryId)?.find((s) => s.id === qual.stateId);
          const selectedCity = citiesMap.get(qual.stateId)?.find((c) => c.id === qual.cityId);
          
          return {
            instituteId: qual.instituteId,
            instituteName: selectedInstitute?.name || "",
            qualification: qual.qualification.trim(),
            country: selectedCountry?.nicename || selectedCountry?.name || "",
            city: selectedCity?.name || "",
          };
        });

        if (qualificationsToCreate.length === 1) {
          const result = await createQualification(qualificationsToCreate[0]);
          if (result.status) {
            toast.success(result.message || "Qualification created successfully");
            const newId = result.data?.id;
            router.push(`/dashboard/master/qualification/list${newId ? `?newItemId=${newId}` : ""}`);
          } else {
            toast.error(result.message || "Failed to create qualification");
          }
        } else {
          const result = await createQualificationsBulk(qualificationsToCreate);
          if (result.status) {
            toast.success(result.message || "Qualifications created successfully");
            router.push("/dashboard/master/qualification/list");
          } else {
            toast.error(result.message || "Failed to create qualifications");
          }
        }
      } catch (error) {
        console.error("Error creating qualification:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/qualification/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Qualification</CardTitle>
          <CardDescription>
            Create new qualification(s) for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4 relative"
                >
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={isPending}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="font-medium text-sm text-muted-foreground mb-2">
                    Qualification {fields.length > 1 && `#${index + 1}`}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`qualifications.${index}.instituteId`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Institute Name</FormLabel>
                            <FormControl>
                              <Autocomplete
                                options={instituteOptions}
                                value={formField.value}
                                onValueChange={formField.onChange}
                                placeholder="Select institute..."
                                searchPlaceholder="Search institute..."
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`qualifications.${index}.qualification`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Qualification</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., BS Computer Science"
                                disabled={isPending}
                                {...formField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`qualifications.${index}.countryId`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Autocomplete
                                options={countryOptions}
                                value={formField.value}
                                onValueChange={(value) => {
                                  formField.onChange(value);
                                  handleCountryChange(index, value);
                                }}
                                placeholder="Select country..."
                                searchPlaceholder="Search country..."
                                disabled={isPending || loadingCountries}
                                isLoading={loadingCountries}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`qualifications.${index}.stateId`}
                        render={({ field: formField }) => {
                          const countryId = form.watch(`qualifications.${index}.countryId`);
                          const stateOptions = getStateOptions(countryId);
                          const isLoadingStates = countryId ? loadingStates.get(countryId) || false : false;
                          return (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Autocomplete
                                  options={stateOptions}
                                  value={formField.value}
                                  onValueChange={(value) => {
                                    formField.onChange(value);
                                    handleStateChange(index, value);
                                  }}
                                  placeholder="Select state..."
                                  searchPlaceholder="Search state..."
                                  disabled={isPending || !countryId}
                                  isLoading={isLoadingStates}
                                  emptyMessage={!countryId ? "Please select a country first" : "No states found"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name={`qualifications.${index}.cityId`}
                        render={({ field: formField }) => {
                          const stateId = form.watch(`qualifications.${index}.stateId`);
                          const cityOptions = getCityOptions(stateId);
                          const isLoadingCities = stateId ? loadingCities.get(stateId) || false : false;
                          return (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Autocomplete
                                  options={cityOptions}
                                  value={formField.value}
                                  onValueChange={formField.onChange}
                                  placeholder="Select city..."
                                  searchPlaceholder="Search city..."
                                  disabled={isPending || !stateId}
                                  isLoading={isLoadingCities}
                                  emptyMessage={!stateId ? "Please select a state first" : "No cities found"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    instituteId: "",
                    qualification: "",
                    countryId: "",
                    stateId: "",
                    cityId: "",
                  })
                }
                disabled={isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Qualification Section
              </Button>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit {fields.length > 1 ? `(${fields.length})` : ""}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isPending}
                >
                  Clear Form
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

