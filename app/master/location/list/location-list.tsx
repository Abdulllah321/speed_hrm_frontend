"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  startTransition,
  addTransitionType,
} from "react";
import DataTable from "@/components/common/data-table";
import { useAuth } from "@/components/providers/auth-provider";
import { columns, LocationRow } from "./columns";
import {
  Location,
  deleteLocations,
  updateLocations,
} from "@/lib/actions/location";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Brand, getBrands } from "@/lib/actions/brand";

interface LocationListProps {
  initialLocations: Location[];
  newItemId?: string;
}

interface BulkEditRow {
  id: string;
  name: string;
  code: string;
  isStockLocation: boolean;
  brandIds: string[];
}

export function LocationList({
  initialLocations,
  newItemId,
}: LocationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<BulkEditRow[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const { hasPermission } = useAuth();
  const showAddAction = hasPermission("master.location.create");
  const canBulkEdit = hasPermission("master.location.update");
  const canBulkDelete = hasPermission("master.location.delete");
  // Filter: 'all' | 'online' | 'offline'
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');

  const fetchBrandsData = async () => {
    const result = await getBrands();
    if (result.status && result.data) {
      setAllBrands(result.data);
    }
  };

  const handleToggle = () => {
    startTransition(() => {
      addTransitionType("nav-forward");
      router.push("/master/location/add");
    });
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      const result = await deleteLocations(ids);
      if (result.status) {
        toast.success(result.message || "Locations deleted successfully");
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete locations");
      }
    });
  };

  const handleBulkEdit = (items: LocationRow[]) => {
    fetchBrandsData();
    setEditRows(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        isStockLocation: item.isStockLocation !== false,
        brandIds: (item.brands || []).map((b) => b.id),
      })),
    );
    setBulkEditOpen(true);
  };

  const updateEditRow = (id: string, field: keyof BulkEditRow, value: any) => {
    setEditRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const toggleBrandForEditRow = (rowId: string, brandId: string) => {
    setEditRows((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const brandIds = r.brandIds.includes(brandId)
          ? r.brandIds.filter((bId) => bId !== brandId)
          : [...r.brandIds, brandId];
        return { ...r, brandIds };
      })
    );
  };

  const applyGlobalStockLocation = (isStockLocation: boolean) => {
    setEditRows((rows) => rows.map((r) => ({ ...r, isStockLocation })));
    toast.success(`Set ${isStockLocation ? 'Stock Location' : 'Non-Stock'} for all selected`);
  };

  const applyGlobalBrandToggle = (brandId: string) => {
    setEditRows((rows) => {
      const allHaveBrand = rows.every((r) => r.brandIds.includes(brandId));
      return rows.map((r) => {
        const brandIds = allHaveBrand
          ? r.brandIds.filter((bId) => bId !== brandId)
          : Array.from(new Set([...r.brandIds, brandId]));
        return { ...r, brandIds };
      });
    });
  };

  const handleBulkEditSubmit = async () => {
    const validRows = editRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      const result = await updateLocations(validRows);
      if (result.status) {
        toast.success(result.message || "Locations updated successfully");
        setBulkEditOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to update locations");
      }
    });
  };

  // Transform data to include string id for DataTable, then apply online filter
  const allData: LocationRow[] = initialLocations.map((loc) => ({
    ...loc,
    id: loc.id.toString(),
  }));

  const data: LocationRow[] = allData.filter((loc) => {
    if (onlineFilter === 'online') return loc.isOnline === true;
    if (onlineFilter === 'offline') return loc.isOnline === false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Locations</h2>
        <p className="text-muted-foreground">
          Manage your organization locations
        </p>
      </div>

      {/* Online / Offline filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Outlet Status:</span>
        <Select value={onlineFilter} onValueChange={(v) => setOnlineFilter(v as any)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            <SelectItem value="online">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Online
              </span>
            </SelectItem>
            <SelectItem value="offline">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Offline
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<LocationRow>
        columns={columns}
        data={data}
        actionText={showAddAction ? "Add Location" : undefined}
        toggleAction={showAddAction ? handleToggle : undefined}
        newItemId={newItemId}
        searchFields={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "city.name", label: "City" }
        ]}
        onMultiDelete={handleMultiDelete}
        onBulkEdit={handleBulkEdit}
        canBulkEdit={canBulkEdit}
        canBulkDelete={canBulkDelete}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Bulk Edit Locations ({editRows.length})</DialogTitle>
            <DialogDescription>
              Update names, stock location status, and registered brands across selected locations.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Apply Bar */}
          <div className="flex-shrink-0 p-3 border rounded-lg bg-muted/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Apply to All Selected ({editRows.length}):</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => applyGlobalStockLocation(true)}
                  disabled={isPending}
                >
                  Mark All as Stock Location
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => applyGlobalStockLocation(false)}
                  disabled={isPending}
                >
                  Mark All as Office / Non-Stock
                </Button>
              </div>
            </div>
            {allBrands.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <span className="text-muted-foreground whitespace-nowrap">Toggle Brand for All:</span>
                <div className="flex flex-wrap gap-1">
                  {allBrands.map((b) => {
                    const allHave = editRows.length > 0 && editRows.every((r) => r.brandIds.includes(b.id));
                    const someHave = editRows.some((r) => r.brandIds.includes(b.id));
                    return (
                      <Button
                        key={b.id}
                        type="button"
                        variant={allHave ? "default" : someHave ? "secondary" : "outline"}
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => applyGlobalBrandToggle(b.id)}
                        disabled={isPending}
                      >
                        {b.name} {allHave ? "✓" : someHave ? "(-)" : ""}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-3 my-2">
            <div className="space-y-4 py-1">
              {editRows.map((row, index) => (
                <div key={row.id} className="p-3 border rounded-lg bg-card space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Location Name</Label>
                      <Input
                        placeholder={`Location ${index + 1}`}
                        value={row.name}
                        onChange={(e) => updateEditRow(row.id, "name", e.target.value)}
                        disabled={isPending}
                        className="h-9"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs text-muted-foreground">Code</Label>
                      <Input
                        value={row.code}
                        onChange={(e) => updateEditRow(row.id, "code", e.target.value.toUpperCase())}
                        disabled={isPending}
                        className="h-9 font-mono uppercase text-xs"
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-1 pt-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-normal">Stock Location</Label>
                        <Switch
                          checked={row.isStockLocation}
                          onCheckedChange={(checked) => updateEditRow(row.id, "isStockLocation", checked)}
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {allBrands.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border/40">
                      <Label className="text-[11px] text-muted-foreground">Registered Brands:</Label>
                      <div className="flex flex-wrap gap-1">
                        {allBrands.map((b) => {
                          const isSelected = row.brandIds.includes(b.id);
                          return (
                            <Button
                              key={b.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="h-6 text-[10px] px-2 py-0"
                              onClick={() => toggleBrandForEditRow(row.id, b.id)}
                              disabled={isPending}
                            >
                              {b.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 pt-2 border-t mt-auto">
            <Button
              variant="outline"
              onClick={() => setBulkEditOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkEditSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save All Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
