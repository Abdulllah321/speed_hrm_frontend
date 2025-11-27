"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import DataTable, { FilterConfig } from "@/components/common/data-table";
import { columns, setCountriesStore, CityRow } from "./columns";
import { City, Country, deleteCities, updateCities } from "@/lib/actions/city";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface CityListProps {
  initialCities: City[];
  countries: Country[];
  newItemId?: string;
}

export function CityList({ initialCities, countries, newItemId }: CityListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<
    { id: string; name: string; countryId: string; lat?: number; lng?: number }[]
  >([]);

  useEffect(() => {
    setCountriesStore(countries);
  }, [countries]);

  const handleToggle = () => {
    router.push("/dashboard/master/city/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteCities(ids);
      if (result.status) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleBulkEdit = (items: CityRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        countryId: item.countryId,
        lat: item.lat,
        lng: item.lng,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, field: string, value: string | number | undefined) => {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeEditRow = (id: string) => {
    if (editRows.length > 1) {
      setEditRows((rows) => rows.filter((r) => r.id !== id));
    }
  };

  const handleBulkEditSubmit = async () => {
    const validRows = editRows.filter((r) => r.name.trim() && r.countryId);
    if (validRows.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await updateCities(validRows);
      if (result.status) {
        toast.success(result.message);
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const data: CityRow[] = initialCities.map((city) => ({
    ...city,
    id: city.id.toString(),
  }));

  const countryFilter: FilterConfig = {
    key: "countryName",
    label: "Country",
    options: countries.map((c) => ({ label: c.name, value: c.name })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cities</h2>
        <p className="text-muted-foreground">Manage cities with coordinates</p>
      </div>

      <DataTable<CityRow>
        columns={columns}
        data={data}
        actionText="Add City"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[
          { key: "name", label: "Name" },
          { key: "countryName", label: "Country" },
        ]}
        filters={[countryFilter]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Cities</DialogTitle>
            <DialogDescription>Update {editRows.length} city(ies)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {editRows.map((row, index) => (
              <div key={row.id} className="flex gap-2 items-end">
                <Select
                  value={row.countryId}
                  onValueChange={(value) => updateEditRow(row.id, "countryId", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={`City ${index + 1}`}
                  value={row.name}
                  onChange={(e) => updateEditRow(row.id, "name", e.target.value)}
                  disabled={isPending}
                  className="flex-1"
                />
                <Input
                  placeholder="Lat"
                  type="number"
                  step="any"
                  value={row.lat || ""}
                  onChange={(e) => updateEditRow(row.id, "lat", e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isPending}
                  className="w-24"
                />
                <Input
                  placeholder="Lng"
                  type="number"
                  step="any"
                  value={row.lng || ""}
                  onChange={(e) => updateEditRow(row.id, "lng", e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={isPending}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEditRow(row.id)}
                  disabled={editRows.length === 1 || isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleBulkEditSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

