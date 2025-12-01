"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns, QualificationRow } from "./columns";
import {
  Qualification,
  deleteQualifications,
  updateQualifications,
} from "@/lib/actions/qualification";
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
import { Loader2 } from "lucide-react";

interface QualificationListProps {
  initialQualifications: Qualification[];
  newItemId?: string;
}

export function QualificationList({
  initialQualifications,
  newItemId,
}: QualificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<{
    id: string;
    instituteName: string;
    qualification: string;
    country: string;
    city: string;
  }[]>([]);

  const handleToggle = () => {
    router.push("/dashboard/master/qualification/add");
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteQualifications(ids);
      if (result.status) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleBulkEdit = (items: QualificationRow[]) => {
    setEditRows(
      items.map((item) => ({
        id: item.id,
        instituteName: item.instituteName,
        qualification: item.qualification,
        country: item.country,
        city: item.city,
      }))
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (
    id: string,
    field: string,
    value: string
  ) => {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleBulkEditSubmit = async () => {
    const validRows = editRows.filter(
      (r) =>
        r.instituteName.trim() &&
        r.qualification.trim() &&
        r.country.trim() &&
        r.city.trim()
    );
    if (validRows.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await updateQualifications(
        validRows.map((r) => ({
          id: r.id,
          instituteName: r.instituteName,
          qualification: r.qualification,
          country: r.country,
          city: r.city,
        }))
      );
      if (result.status) {
        toast.success(result.message);
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  // Transform data to include string id for DataTable
  const data: QualificationRow[] = initialQualifications.map((qual) => ({
    ...qual,
    id: qual.id.toString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Qualifications</h2>
        <p className="text-muted-foreground">
          Manage qualifications for your organization
        </p>
      </div>

      <DataTable<QualificationRow>
        columns={columns}
        data={data}
        actionText="Add Qualification"
        toggleAction={handleToggle}
        newItemId={newItemId}
        searchFields={[
          { key: "instituteName", label: "Institute" },
          { key: "qualification", label: "Qualification" },
          { key: "country", label: "Country" },
          { key: "city", label: "City" },
        ]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Qualifications</DialogTitle>
            <DialogDescription>
              Update {editRows.length} qualification(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editRows.map((row, index) => (
              <div
                key={row.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="font-medium text-sm text-muted-foreground">
                  Qualification {index + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Institute Name</label>
                    <Input
                      placeholder="Institute name"
                      value={row.instituteName}
                      onChange={(e) =>
                        updateEditRow(row.id, "instituteName", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Qualification</label>
                    <Input
                      placeholder="Qualification"
                      value={row.qualification}
                      onChange={(e) =>
                        updateEditRow(row.id, "qualification", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      placeholder="Country"
                      value={row.country}
                      onChange={(e) =>
                        updateEditRow(row.id, "country", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      placeholder="City"
                      value={row.city}
                      onChange={(e) =>
                        updateEditRow(row.id, "city", e.target.value)
                      }
                      disabled={isPending}
                    />
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

