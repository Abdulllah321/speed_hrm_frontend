"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
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

interface BranchRow {
  id: number;
  name: string;
  address: string;
  cityId: string;
  status: "active" | "inactive";
}

export function BranchAddForm({ cities }: BranchAddFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [defaultCityId, setDefaultCityId] = useState("");
  const [branches, setBranches] = useState<BranchRow[]>([
    { id: 1, name: "", address: "", cityId: "", status: "active" },
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cityIdParam = params.get("cityId") || "";
    setDefaultCityId(cityIdParam);
    if (cityIdParam) {
      setBranches((prev) =>
        prev.map((b, i) => (i === 0 ? { ...b, cityId: cityIdParam } : b))
      );
    }
  }, []);

  const addRow = () => {
    setBranches([
      ...branches,
      { id: Date.now(), name: "", address: "", cityId: defaultCityId, status: "active" },
    ]);
  };

  const removeRow = (id: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((b) => b.id !== id));
    }
  };

  const updateBranch = (id: number, field: keyof BranchRow, value: string) => {
    setBranches(branches.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validBranches = branches.filter((b) => b.name.trim());
    if (validBranches.length === 0) {
      toast.error("Please enter at least one branch name");
      return;
    }

    // Validate cityId for all branches
    const invalidBranch = validBranches.find((b) => !b.cityId);
    if (invalidBranch) {
      toast.error("Please select a city for all branches");
      return;
    }

    startTransition(async () => {
      try {
        const data = validBranches.map((b) => ({
          name: b.name.trim(),
          address: b.address.trim() || undefined,
          cityId: b.cityId,
          status: b.status,
        }));

        if (data.length === 1) {
          const result = await createBranch(data[0]);
          if (result.status) {
            toast.success(result.message || "Branch created successfully");
            const newId = result.data?.id;
            router.push(`/dashboard/master/branch/list${newId ? `?newItemId=${newId}` : ""}`);
          } else {
            toast.error(result.message || "Failed to create branch");
          }
        } else {
          const result = await createBranchesBulk(data);
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/master/branch/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Branches</CardTitle>
          <CardDescription>Create one or more branches for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {branches.map((branch, index) => (
                <div key={branch.id} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    {index === 0 && <Label>Name</Label>}
                    <Input
                      placeholder={`Branch ${index + 1}`}
                      value={branch.name}
                      onChange={(e) => updateBranch(branch.id, "name", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    {index === 0 && <Label>Address</Label>}
                    <Input
                      placeholder="Address"
                      value={branch.address}
                      onChange={(e) => updateBranch(branch.id, "address", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="w-[200px] space-y-1">
                    {index === 0 && <Label>City</Label>}
                    <Autocomplete
                      options={cities.map((city) => ({
                        value: city.id,
                        label: `${city.name}${city.country ? ` (${city.country.name})` : ""}`,
                      }))}
                      value={branch.cityId}
                      onValueChange={(value) => updateBranch(branch.id, "cityId", value)}
                      placeholder="Select city..."
                      searchPlaceholder="Search city..."
                      disabled={isPending}
                    />
                  </div>
                  <div className="w-[110px] space-y-1">
                    {index === 0 && <Label>Status</Label>}
                    <Select
                      value={branch.status}
                      onValueChange={(value) => updateBranch(branch.id, "status", value)}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(branch.id)}
                    disabled={branches.length === 1 || isPending}
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
                  Create {branches.length > 1 ? `${branches.length} Branches` : "Branch"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
              <button
                type="button"
                onClick={addRow}
                disabled={isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                + Add more
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
