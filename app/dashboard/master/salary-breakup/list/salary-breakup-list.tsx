"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns, SalaryBreakupRow } from "./columns";
import { SalaryBreakup } from "@/lib/actions/salary-breakup";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface SalaryBreakupListProps {
  initialSalaryBreakups: SalaryBreakup[];
  newItemId?: string;
}

export function SalaryBreakupList({ initialSalaryBreakups, newItemId }: SalaryBreakupListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<{ id: string; salaryType: string; percent: string; isTaxable: boolean }[]>([]);

  // Convert salary breakups to rows (one row per salary breakup)
  const data: SalaryBreakupRow[] = initialSalaryBreakups.map((sb) => {
    const percentage = sb.percentage 
      ? (typeof sb.percentage === 'string' ? parseFloat(sb.percentage) : sb.percentage)
      : 0;
    
    return {
      id: sb.id,
      salaryType: sb.name,
      percent: percentage,
      isTaxable: false, // Not available in current schema
      createdBy: sb.createdBy || "",
      status: sb.status === "active" ? "Active" : "Inactive",
      breakupId: sb.id,
      breakupName: sb.name,
    };
  });

  const handleToggle = () => {
    router.push("/dashboard/master/salary-breakup/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    // TODO: Implement multi-delete when backend endpoint is available
    toast.info("Multi-delete functionality will be available soon");
  };

  const handleBulkEdit = (items: SalaryBreakupRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        salaryType: item.salaryType,
        percent: item.percent.toString(),
        isTaxable: item.isTaxable,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, field: "salaryType" | "percent" | "isTaxable", value: string | boolean) => {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleBulkEditSubmit = async () => {
    const validRows = editRows.filter((r) => r.salaryType.trim() && !isNaN(parseFloat(r.percent)));
    if (validRows.length === 0) {
      toast.error("Please fill in all fields correctly");
      return;
    }
    // TODO: Implement bulk update when backend endpoint is available
    toast.info("Bulk edit functionality will be available soon");
    setBulkEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Salary Breakup</h2>
        <p className="text-muted-foreground">Manage salary breakup configurations</p>
      </div>

      <DataTable<SalaryBreakupRow>
        columns={columns}
        data={data}
        actionText="Add Salary Breakup"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[
          { key: "salaryType", label: "Name" },
        ]}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ],
          },
          {
            key: "isTaxable",
            label: "Taxable",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
        ]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
      />

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Salary Breakup Entries</DialogTitle>
            <DialogDescription>Update {editRows.length} salary breakup entry(ies)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {editRows.map((row, index) => (
              <div key={row.id} className="space-y-2 p-3 border rounded-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Salary Type ${index + 1}`}
                    value={row.salaryType}
                    onChange={(e) => updateEditRow(row.id, "salaryType", e.target.value)}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Percent"
                    value={row.percent}
                    onChange={(e) => updateEditRow(row.id, "percent", e.target.value)}
                    disabled={isPending}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={row.isTaxable}
                    onCheckedChange={(checked) => updateEditRow(row.id, "isTaxable", !!checked)}
                    disabled={isPending}
                  />
                  <Label className="font-normal text-sm">Taxable</Label>
                </div>
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
