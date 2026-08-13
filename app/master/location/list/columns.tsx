"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HighlightText } from "@/components/common/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import {
  EllipsisIcon,
  Loader2,
  Pencil,
  Trash2,
  Monitor,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Location,
  updateLocations,
  updateSingleLocation,
  deleteLocation,
  updateLocationOtherInfo,
  updateLocationOnlineStatus,
} from "@/lib/actions/location";
import { getCities, City } from "@/lib/actions/city";
import { getBrands, Brand } from "@/lib/actions/brand";
import { useAuth } from "@/components/providers/auth-provider";
import { ManagePosModal } from "./pos-management-modal";
import { ChartOfAccountSelect } from "@/components/ui/chart-of-account-select";
import { getChartOfAccountsTree } from "@/lib/actions/chart-of-account";

export type LocationRow = Location & {
  id: string;
  pos?: {
    id: string;
    posId: string;
    name: string;
    status: string;
  }[];
};

export const columns: ColumnDef<LocationRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 28,
  },
  {
    header: "Name",
    accessorKey: "name",
    size: 200,
    enableSorting: true,
    cell: ({ row }) => <HighlightText text={row.original.name} />,
  },
  {
    header: "Code",
    accessorKey: "code",
    size: 150,
    enableSorting: true,
    cell: ({ row }) => <HighlightText text={row.original.code} />,
  },
  {
    header: "Stock Location",
    accessorKey: "isStockLocation",
    size: 140,
    cell: ({ row }) => {
      const isStock = row.original.isStockLocation !== false;
      return (
        <Badge
          variant={isStock ? "default" : "outline"}
          className={
            isStock
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "text-amber-600 border-amber-500 dark:text-amber-400"
          }
        >
          {isStock ? "Stock Location" : "Office / Non-Stock"}
        </Badge>
      );
    },
    enableSorting: true,
  },
  {
    header: "Registered Brands",
    accessorKey: "brands",
    size: 180,
    cell: ({ row }) => {
      const brands = row.original.brands || [];
      if (brands.length === 0)
        return (
          <span className="text-muted-foreground italic text-xs">None</span>
        );
      return (
        <div className="flex flex-wrap gap-1">
          {brands.map((b) => (
            <Badge
              key={b.id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            >
              {b.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    header: "Short Code",
    accessorKey: "shortCode",
    size: 120,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.shortCode || (
        <span className="text-muted-foreground italic">N/A</span>
      ),
  },
  {
    header: "City",
    accessorKey: "city.name",
    size: 130,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.city?.name || (
        <span className="text-muted-foreground italic">N/A</span>
      ),
  },
  {
    header: "POS Terminals",
    accessorKey: "pos",
    size: 160,
    cell: ({ row }) => {
      const posList = row.original.pos || [];
      if (posList.length === 0)
        return <span className="text-muted-foreground italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {posList.map((p) => (
            <Badge
              key={p.id}
              variant={p.status === "active" ? "outline" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {p.posId}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    header: "Status",
    accessorKey: "status",
    size: 100,
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "default" : "secondary"}
      >
        {row.original.status}
      </Badge>
    ),
    enableSorting: true,
  },
  {
    header: "Online",
    accessorKey: "isOnline",
    size: 100,
    cell: ({ row }) => {
      const online = row.original.isOnline;
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${
              online
                ? "bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.5)]"
                : "bg-gray-400"
            }`}
          />
          <span
            className={`text-xs font-medium ${online ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
  },
];

type RowActionsProps = {
  row: Row<LocationRow>;
};

import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function RowActions({ row }: RowActionsProps) {
  const location = row.original;
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [posModal, setPosModal] = useState(false);
  const [cities, setCities] = useState<City[]>([]);

  // Local state for Cash GL Account selection
  const [accountsTree, setAccountsTree] = useState<any[]>([]);
  const [flatAccounts, setFlatAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
  };

  // Local state for brands and stock location
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [isStockLocation, setIsStockLocation] = useState<boolean>(
    location.isStockLocation !== false,
  );

  // Local state for toggles to handle UI conditionally
  const [geoFenceEnabled, setGeoFenceEnabled] = useState(
    location.geoFenceEnabled || false,
  );
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(
    location.ipWhitelistEnabled || false,
  );
  const [fbrEnabled, setFbrEnabled] = useState(location.fbrEnabled || false);

  const canEdit = hasPermission("master.location.update");
  const canDelete = hasPermission("master.location.delete");
  const canManagePos = hasPermission("master.pos.read");

  if (!canEdit && !canDelete && !canManagePos) {
    return null;
  }

  const fetchCities = async () => {
    const result = await getCities();
    if (result.status && result.data) {
      setCities(result.data);
    }
  };

  const fetchBrandsData = async () => {
    const result = await getBrands();
    if (result.status && result.data) {
      setAllBrands(result.data);
    }
  };

  const handleEditOpen = () => {
    fetchCities();
    fetchBrandsData();
    setSelectedBrandIds((location.brands || []).map((b) => b.id));
    setIsStockLocation(location.isStockLocation !== false);

    getChartOfAccountsTree().then((res) => {
      if (res.status && res.data) {
        setAccountsTree(res.data);
        const flat: any[] = [];
        const walk = (list: any[]) => {
          for (const node of list) {
            flat.push(node);
            if (node.children?.length) walk(node.children);
          }
        };
        walk(res.data);
        setFlatAccounts(flat);

        if (location.cashGLCode) {
          const acc = flat.find((a) => a.code === location.cashGLCode);
          if (acc) {
            setSelectedAccountId(acc.id);
          } else {
            setSelectedAccountId("");
          }
        } else {
          setSelectedAccountId("");
        }
      }
    });
    setGeoFenceEnabled(location.geoFenceEnabled || false);
    setIpWhitelistEnabled(location.ipWhitelistEnabled || false);
    setFbrEnabled(location.fbrEnabled || false);
    setEditDialog(true);
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrandIds((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId],
    );
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const selectedAccount = flatAccounts.find(
      (a) => a.id === selectedAccountId,
    );
    const cashGLCode = selectedAccount ? selectedAccount.code : null;

    startTransition(async () => {
      const resGeneral = await updateSingleLocation(location.id, {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        shortCode: (formData.get("shortCode") as string) || undefined,
        address: formData.get("address") as string,
        cityId: formData.get("cityId") as string,
        cashGLCode,
        isStockLocation,
        brandIds: selectedBrandIds,
      });

      if (!resGeneral.status) {
        toast.error(resGeneral.message || "Failed to update general info");
        return;
      }

      const latVal = formData.get("latitude")
        ? Number(formData.get("latitude"))
        : undefined;
      const lngVal = formData.get("longitude")
        ? Number(formData.get("longitude"))
        : undefined;
      const radiusVal = formData.get("geoFenceRadius")
        ? Number(formData.get("geoFenceRadius"))
        : undefined;

      const resOther = await updateLocationOtherInfo(location.id, {
        phone: formData.get("phone") as string,
        latitude: latVal,
        longitude: lngVal,
        geoFenceEnabled,
        geoFenceRadius: radiusVal,
        ipWhitelistEnabled,
        ipWhitelist: formData.get("ipWhitelist") as string,
        fbrEnabled,
        fbrBposId: formData.get("fbrBposId") as string,
        fbrNtn: formData.get("fbrNtn") as string,
        fbrSellerName: formData.get("fbrSellerName") as string,
        fbrBearerToken: formData.get("fbrBearerToken") as string,
      });

      if (resOther.status) {
        toast.success("Location details updated successfully");
        setEditDialog(false);
        router.refresh();
      } else {
        toast.error(resOther.message || "Failed to update additional details");
      }
    });
  };

  const handleDeleteConfirm = async () => {
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (result.status) {
        toast.success(result.message);
        setDeleteDialog(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="shadow-none"
              aria-label="Actions"
            >
              <EllipsisIcon size={16} />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={handleEditOpen}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem
              onClick={async () => {
                const res = await updateLocationOnlineStatus(
                  location.id,
                  !location.isOnline,
                );
                if (res.status) {
                  toast.success(
                    `Marked as ${!location.isOnline ? "Online" : "Offline"}`,
                  );
                  router.refresh();
                } else {
                  toast.error(res.message || "Failed to update online status");
                }
              }}
            >
              {location.isOnline ? (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Mark Offline
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Mark Online
                </>
              )}
            </DropdownMenuItem>
          )}
          {canManagePos && (
            <DropdownMenuItem onClick={() => setPosModal(true)}>
              <Monitor className="h-4 w-4 mr-2" />
              Manage POS
            </DropdownMenuItem>
          )}{" "}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ManagePosModal
        open={posModal}
        onOpenChange={setPosModal}
        locationId={location.id}
        locationName={location.name}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update the location details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General Info</TabsTrigger>
                <TabsTrigger value="security">Security & Access</TabsTrigger>
                <TabsTrigger value="fbr">FBR Integration</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={location.name}
                      disabled={isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Location Code</Label>
                    <Input
                      id="edit-code"
                      name="code"
                      defaultValue={location.code}
                      disabled={isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-short-code">
                      Short Code (Optional)
                    </Label>
                    <Input
                      id="edit-short-code"
                      name="shortCode"
                      defaultValue={location.shortCode || ""}
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Select
                      name="cityId"
                      defaultValue={location.cityId || ""}
                      disabled={isPending}
                    >
                      <SelectTrigger id="edit-city">
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      name="phone"
                      defaultValue={location.phone || ""}
                      disabled={isPending}
                      placeholder="e.g. +92 300 1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      name="address"
                      defaultValue={location.address || ""}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cash GL Account</Label>
                    <ChartOfAccountSelect
                      accounts={accountsTree}
                      value={selectedAccountId}
                      onValueChange={handleAccountChange}
                      placeholder="Select Cash GL Account"
                      disabled={isPending}
                    />
                    {location.cashGLCode && !selectedAccountId && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Current GL Code: {location.cashGLCode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Stock Location
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Whether this location holds physical inventory (uncheck
                      for Office / HQ locations).
                    </p>
                  </div>
                  <Switch
                    checked={isStockLocation}
                    onCheckedChange={setIsStockLocation}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-sm font-medium block">
                    Registered Brands
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select brands available at this location (e.g. Nike, Puma,
                    Adidas).
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                    {allBrands.map((b) => {
                      const isSelected = selectedBrandIds.includes(b.id);
                      return (
                        <Button
                          key={b.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleBrandToggle(b.id)}
                          disabled={isPending}
                        >
                          {b.name}
                        </Button>
                      );
                    })}
                    {allBrands.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        No brands found
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6 py-4">
                <div className="space-y-4 border rounded-lg p-4">
                  <Label className="text-base block">Coordinates</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-latitude">Latitude</Label>
                      <Input
                        id="edit-latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        defaultValue={
                          location.latitude !== null
                            ? Number(location.latitude)
                            : ""
                        }
                        placeholder="e.g. 34.0151"
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-longitude">Longitude</Label>
                      <Input
                        id="edit-longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        defaultValue={
                          location.longitude !== null
                            ? Number(location.longitude)
                            : ""
                        }
                        placeholder="e.g. 71.5249"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Geo-Fencing</Label>
                      <p className="text-sm text-muted-foreground">
                        Restrict login to a specific radius
                      </p>
                    </div>
                    <Switch
                      checked={geoFenceEnabled}
                      onCheckedChange={setGeoFenceEnabled}
                      disabled={isPending}
                    />
                  </div>
                  {geoFenceEnabled && (
                    <div className="pt-2 pl-2 border-l-2 border-primary/20 ml-1">
                      <Label htmlFor="edit-radius">Radius (meters)</Label>
                      <Input
                        id="edit-radius"
                        name="geoFenceRadius"
                        type="number"
                        defaultValue={location.geoFenceRadius || 100}
                        disabled={isPending}
                        min={10}
                        className="mt-1.5 max-w-[200px]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">IP Whitelisting</Label>
                      <p className="text-sm text-muted-foreground">
                        Restrict login to specific IP addresses
                      </p>
                    </div>
                    <Switch
                      checked={ipWhitelistEnabled}
                      onCheckedChange={setIpWhitelistEnabled}
                      disabled={isPending}
                    />
                  </div>
                  {ipWhitelistEnabled && (
                    <div className="pt-2 pl-2 border-l-2 border-primary/20 ml-1">
                      <Label htmlFor="edit-ips">
                        Allowed IPs (comma separated)
                      </Label>
                      <Input
                        id="edit-ips"
                        name="ipWhitelist"
                        defaultValue={location.ipWhitelist || ""}
                        disabled={isPending}
                        placeholder="192.168.1.1, 10.0.0.1"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="fbr" className="space-y-4 py-4">
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">FBR POS Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable FBR real-time sales reporting for this location
                      </p>
                    </div>
                    <Switch
                      checked={fbrEnabled}
                      onCheckedChange={setFbrEnabled}
                      disabled={isPending}
                    />
                  </div>
                  {fbrEnabled && (
                    <div className="space-y-4 pt-2 pl-2 border-l-2 border-primary/20 ml-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-fbr-bpos">FBR BPOS ID</Label>
                          <Input
                            id="edit-fbr-bpos"
                            name="fbrBposId"
                            defaultValue={location.fbrBposId || ""}
                            disabled={isPending}
                            placeholder="e.g. 123456"
                            required={fbrEnabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-fbr-ntn">FBR NTN</Label>
                          <Input
                            id="edit-fbr-ntn"
                            name="fbrNtn"
                            defaultValue={location.fbrNtn || ""}
                            disabled={isPending}
                            placeholder="e.g. 1234567-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-fbr-seller">Seller Name</Label>
                        <Input
                          id="edit-fbr-seller"
                          name="fbrSellerName"
                          defaultValue={location.fbrSellerName || ""}
                          disabled={isPending}
                          placeholder="e.g. Speed (pvt.) Limited Retail"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-fbr-token">FBR Bearer Token</Label>
                        <Input
                          id="edit-fbr-token"
                          name="fbrBearerToken"
                          defaultValue={location.fbrBearerToken || ""}
                          disabled={isPending}
                          placeholder="FBR Bearer Token for authorization"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{location.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
