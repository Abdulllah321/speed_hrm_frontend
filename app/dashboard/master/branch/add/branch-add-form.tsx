"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBranch, createBranchesBulk } from "@/lib/actions/branch";

interface City {
  id: string;
  name: string;
  country?: { id: string; name: string };
}

interface BranchAddFormProps {
  cities: City[];
}

// Zod schema for branch validation
const branchSchema = z.object({
  branches: z
    .array(
      z.object({
        name: z.string().min(1, "Branch name is required").trim(),
        address: z.string().optional(),
        cityId: z.string().min(1, "City is required"),
        status: z.enum(["active", "inactive"], {
          message: "Status is required",
        }),
      })
    )
    .min(1, "At least one branch is required"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export function BranchAddForm({ cities }: BranchAddFormProps) {
  const router = useRouter();
  const [defaultCityId, setDefaultCityId] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      branches: [
        {
          name: "",
          address: "",
          cityId: defaultCityId,
          status: "active" as const,
        },
      ],
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityIdParam = params.get("cityId") || "";
    setDefaultCityId(cityIdParam);
    if (cityIdParam) {
      form.setValue("branches.0.cityId", cityIdParam);
    }
  }, [form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "branches",
  });

  const onSubmit = async (data: BranchFormValues) => {
    startTransition(async () => {
      try {
        const branches = data.branches.map((branch) => ({
          name: branch.name.trim(),
          address: branch.address?.trim() || undefined,
          cityId: branch.cityId || undefined,
          status: branch.status,
        }));

        if (branches.length === 1) {
          const result = await createBranch(branches[0]);
          console.log(result);
          if (result.status) {
            toast.success(result.message || "Branch created successfully");
            const newId = result.data?.id;
            router.push(`/dashboard/master/branch/list${newId ? `?newItemId=${newId}` : ""}`);
          } else {
            toast.error(result.message || "Failed to create branch");
          }
        } else {
          const result = await createBranchesBulk(branches);
          console.log(result);
          if (result.status) {
            toast.success(result.message || "Branches created successfully");
            router.push("/dashboard/master/branch/list");
          } else {
            toast.error(result.message || "Failed to create branches");
          }
        }
      } catch (error) {
        console.error("Error creating branch:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add Branch</h2>
        <p className="text-muted-foreground">Create new location branches</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <FormField
                  control={form.control}
                  name={`branches.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Name</FormLabel>}
                      <FormControl>
                        <Input
                          placeholder={`Branch ${index + 1}`}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`branches.${index}.address`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Address</FormLabel>}
                      <FormControl>
                        <Input
                          placeholder="Address"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`branches.${index}.cityId`}
                  render={({ field }) => (
                    <FormItem className="w-[200px]">
                      {index === 0 && <FormLabel>City</FormLabel>}
                      <FormControl>
                        <Autocomplete
                          options={cities.map((city) => ({
                            value: city.id,
                            label: `${city.name}${city.country ? ` (${city.country.name})` : ""}`,
                          }))}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select city..."
                          searchPlaceholder="Search city..."
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`branches.${index}.status`}
                  render={({ field }) => (
                    <FormItem className="w-[110px]">
                      {index === 0 && <FormLabel>Status</FormLabel>}
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1 || isPending}
                  className="mb-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save {fields.length > 1 ? `(${fields.length})` : ""}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/master/branch/list")}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  name: "",
                  address: "",
                  cityId: defaultCityId,
                  status: "active" as const,
                })
              }
              disabled={isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

