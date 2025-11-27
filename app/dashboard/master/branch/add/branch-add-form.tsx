"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface BranchRow {
  name: string;
  address: string;
  cityId: string;
  status: string;
}

export function BranchAddForm({ cities }: BranchAddFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCityId = searchParams.get("cityId") || "";
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<BranchRow[]>([
    { name: "", address: "", cityId: defaultCityId, status: "active" },
  ]);

  const addRow = () => {
    setRows([...rows, { name: "", address: "", cityId: defaultCityId, status: "active" }]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof BranchRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Please enter at least one branch name");
      return;
    }

    startTransition(async () => {
      let result;
      if (validRows.length === 1) {
        result = await createBranch(validRows[0]);
      } else {
        result = await createBranchesBulk(validRows);
      }
      if (result.status) {
        toast.success(result.message);
        const newId = "data" in result && result.data && "id" in result.data ? result.data.id : undefined;
        router.push(`/dashboard/master/branch/list${newId ? `?newItemId=${newId}` : ""}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add Branch</h2>
        <p className="text-muted-foreground">Create new location branches</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                {index === 0 && <Label>Name</Label>}
                <Input
                  placeholder={`Branch ${index + 1}`}
                  value={row.name}
                  onChange={(e) => updateRow(index, "name", e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="flex-1 space-y-1">
                {index === 0 && <Label>Address</Label>}
                <Input
                  placeholder="Address"
                  value={row.address}
                  onChange={(e) => updateRow(index, "address", e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="w-[150px] space-y-1">
                {index === 0 && <Label>City</Label>}
                <Select
                  value={row.cityId}
                  onValueChange={(value) => updateRow(index, "cityId", value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name} {city.country ? `(${city.country.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[110px] space-y-1">
                {index === 0 && <Label>Status</Label>}
                <Select
                  value={row.status}
                  onValueChange={(value) => updateRow(index, "status", value)}
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
                onClick={() => removeRow(index)}
                disabled={rows.length === 1 || isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addRow} disabled={isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add Another
        </Button>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save {rows.length > 1 ? `(${rows.length})` : ""}
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
      </form>
    </div>
  );
}

