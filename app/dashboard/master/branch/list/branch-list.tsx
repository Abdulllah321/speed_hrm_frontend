"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import DataTable, { FilterConfig } from "@/components/common/data-table";
import { columns, setCitiesStore, BranchRow, City } from "./columns";
import { Branch, deleteBranches, updateBranchesBulk } from "@/lib/actions/branch";
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
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface BranchListProps {
  initialBranches: Branch[];
  cities: City[];
  newItemId?: string;
}

export function BranchList({ initialBranches, cities, newItemId }: BranchListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<
    { id: string; name: string; address: string; cityId: string; status: string }[]
  >([]);

  useEffect(() => {
    setCitiesStore(cities);
  }, [cities]);

  const handleToggle = () => {
    router.push("/dashboard/master/branch/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteBranches(ids);
      if (result.status) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleBulkEdit = (items: BranchRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        address: item.address || "",
        cityId: item.cityId || "",
        status: item.status,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, field: string, value: string) => {
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
    const validRows = editRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await updateBranchesBulk(validRows);
      if (result.status) {
        toast.success(result.message);
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const data: BranchRow[] = initialBranches.map((branch) => ({
    ...branch,
    id: branch.id.toString(),
  }));

  const statusFilter: FilterConfig = {
    key: "status",
    label: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  };

  const cityFilter: FilterConfig = {
    key: "cityName",
    label: "City",
    options: cities.map((c) => ({ label: c.name, value: c.name })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branches</h2>
        <p className="text-muted-foreground">Manage location branches</p>
      </div>

      <DataTable<BranchRow>
        columns={columns}
        data={data}
        actionText="Add Branch"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[
          { key: "name", label: "Name" },
          { key: "cityName", label: "City" },
        ]}
        filters={[statusFilter, cityFilter]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
        tableId="branch-list"
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Branches</DialogTitle>
            <DialogDescription>Update {editRows.length} branch(es)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {editRows.map((row, index) => (
              <div key={row.id} className="flex gap-2 items-end">
                <Input
                  placeholder={`Branch ${index + 1}`}
                  value={row.name}
                  onChange={(e) => updateEditRow(row.id, "name", e.target.value)}
                  disabled={isPending}
                  className="flex-1"
                />
                <Input
                  placeholder="Address"
                  value={row.address}
                  onChange={(e) => updateEditRow(row.id, "address", e.target.value)}
                  disabled={isPending}
                  className="flex-1"
                />
                <div className="w-[180px]">
                  <Autocomplete
                    options={cities.map((c) => ({
                      value: c.id,
                      label: c.name + (c.country ? ` (${c.country.name})` : ""),
                    }))}
                    value={row.cityId}
                    onValueChange={(value) => updateEditRow(row.id, "cityId", value)}
                    placeholder="Select city..."
                    searchPlaceholder="Search city..."
                    disabled={isPending}
                  />
                </div>
                <Select
                  value={row.status}
                  onValueChange={(value) => updateEditRow(row.id, "status", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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

