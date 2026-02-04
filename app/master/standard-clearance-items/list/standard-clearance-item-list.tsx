"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns, StandardClearanceItemRow } from "./columns";
import {
  StandardClearanceItem,
  deleteStandardClearanceItems,
  updateStandardClearanceItems,
} from "@/lib/actions/standard-clearance-item";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2 } from "lucide-react";

interface StandardClearanceItemListProps {
  initialItems: StandardClearanceItem[];
  newItemId?: string;
}

export function StandardClearanceItemList({
  initialItems,
  newItemId,
}: StandardClearanceItemListProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const showAddAction = hasPermission("standard-clearance-item.create");
  const canBulkEdit = hasPermission("standard-clearance-item.update");
  const canBulkDelete = hasPermission("standard-clearance-item.delete");

  const [editRows, setEditRows] = useState<{
    id: string;
    name: string;
    description: string;
    department: string;
    required: boolean;
    active: boolean;
    sortOrder: number;
  }[]>([]);

  const handleToggle = () => {
    router.push("/master/standard-clearance-items/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteStandardClearanceItems(ids);
      if (result.status) {
        toast.success(result.message || "Standard clearance items deactivated successfully");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to deactivate standard clearance items");
      }
    });
  };

  const handleBulkEdit = (items: StandardClearanceItemRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        department: item.department,
        required: item.required,
        active: item.active,
        sortOrder: item.sortOrder,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, field: string, value: any) => {
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
      const result = await updateStandardClearanceItems(validRows);
      if (result.status) {
        toast.success(result.message || "Standard clearance items updated successfully");
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to update standard clearance items");
      }
    });
  };

  // Transform data to include string id for DataTable
  const data: StandardClearanceItemRow[] = initialItems.map((item) => ({
    ...item,
    id: item.id.toString(),
  }));

  const departments = ["IT", "Finance", "Admin", "HR"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Standard Clearance Items</h2>
        <p className="text-muted-foreground">
          Manage standard clearance items for exit clearance processes
        </p>
      </div>

      <DataTable<StandardClearanceItemRow>
        columns={columns}
        data={data}
        actionText={showAddAction ? "Add Standard Item" : undefined}
        toggleAction={showAddAction ? handleToggle : undefined}
        newItemId={newItemId}
        searchFields={[
          { key: "name", label: "Name" },
          { key: "department", label: "Department" },
          { key: "description", label: "Description" },
        ]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
        canBulkEdit={canBulkEdit}
        canBulkDelete={canBulkDelete}
        tableId="standard-clearance-item-list"
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Standard Clearance Items</DialogTitle>
            <DialogDescription>
              Update {editRows.length} standard clearance item(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {editRows.map((row, index) => (
              <div key={row.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {editRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEditRow(row.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Item name"
                      value={row.name}
                      onChange={(e) => updateEditRow(row.id, "name", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select
                      value={row.department}
                      onValueChange={(value) => updateEditRow(row.id, "department", value)}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Item description (optional)"
                    value={row.description}
                    onChange={(e) => updateEditRow(row.id, "description", e.target.value)}
                    disabled={isPending}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={row.sortOrder}
                      onChange={(e) => updateEditRow(row.id, "sortOrder", parseInt(e.target.value) || 0)}
                      disabled={isPending}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`required-${row.id}`}
                      checked={row.required}
                      onCheckedChange={(checked) => updateEditRow(row.id, "required", checked)}
                      disabled={isPending}
                    />
                    <Label htmlFor={`required-${row.id}`}>Required</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${row.id}`}
                      checked={row.active}
                      onCheckedChange={(checked) => updateEditRow(row.id, "active", checked)}
                      disabled={isPending}
                    />
                    <Label htmlFor={`active-${row.id}`}>Active</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkEditOpen(false)}
              disabled={isPending}
            >
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