"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/auth";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getCookie } from "cookies-next";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "../providers/auth-provider";
import { getLocations } from "@/lib/actions/location";

export function AdminOutletSwitcher() {
  const { isAdmin, user } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      setIsReady(true);
      return;
    }
    
    // Fetch locations
    const fetchLocations = async () => {
      try {
        const [locRes, brandsRes] = await Promise.all([
          getLocations(true),
          user?.id ? authFetch(`/employees/user/${user.id}/brands`) : Promise.resolve({ ok: false, data: [] })
        ]);

        let allLocs: any[] = [];
        if (Array.isArray(locRes)) {
          allLocs = locRes;
        } else if (locRes?.status && locRes?.data) {
          allLocs = locRes.data;
        } else if (locRes?.data) {
          allLocs = locRes.data;
        }

        let uBrands: string[] = [];
        if (brandsRes.ok && Array.isArray(brandsRes.data?.data)) {
          uBrands = brandsRes.data.data.map((b: any) => b.id);
        } else if (brandsRes.ok && Array.isArray(brandsRes.data)) {
          uBrands = brandsRes.data.map((b: any) => b.id);
        }

        const isSuperAdmin = user?.role?.name?.toLowerCase() === 'super_admin' || user?.role?.name?.toLowerCase() === 'admin';

        if (!isSuperAdmin && uBrands.length > 0) {
          allLocs = allLocs.filter((loc: any) => {
            if (!loc.brands || loc.brands.length === 0) return true;
            return loc.brands.some((b: any) => uBrands.includes(b.id));
          });
        }

        setLocations(allLocs);
      } catch (err) {
        console.error("Failed to fetch locations", err);
      } finally {
        setIsReady(true);
      }
    };
    fetchLocations();

    const currentLoc = getCookie("pos_location_id") as string;
    if (currentLoc) {
      setCurrentLocationId(currentLoc);
    }
  }, [isAdmin]);

  if (!isReady || !isAdmin()) return null;

  const handleSwitch = async (locationId: string) => {
    if (locationId === currentLocationId) return;
    setIsLoading(true);
    setCurrentLocationId(locationId);
    
    try {
      const res = await authFetch("/auth/pos/admin-switch-outlet", {
        method: "POST",
        body: { locationId }
      });
      if (res.ok && res.data?.status) {
        toast.success(res.data.message || "Outlet switched successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(res.data?.message || "Failed to switch outlet");
        setIsLoading(false);
      }
    } catch (err) {
      toast.error("Failed to switch outlet");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mr-2">
      <Select 
        value={currentLocationId} 
        onValueChange={handleSwitch}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] h-9 border-dashed font-medium text-xs bg-muted/50">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          ) : null}
          <SelectValue placeholder="Switch Outlet" />
        </SelectTrigger>
        <SelectContent>
          <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-background z-10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search outlet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-7 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none text-xs"
            />
          </div>
          {locations
            .filter((loc) => 
               loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
               loc.shortcode?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((loc) => (
            <SelectItem key={loc.id} value={loc.id} className="text-xs py-2">
              {loc.name} {loc.shortCode ? `(${loc.shortCode})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
