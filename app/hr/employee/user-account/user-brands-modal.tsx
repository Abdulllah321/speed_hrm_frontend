"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Tags } from "lucide-react";
import { getUserBrands, updateUserBrands } from "@/lib/actions/employee";
import { brandApi } from "@/lib/api";

interface UserBrandsModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BRAND_GROUPS = [
  {
    name: "Watches",
    brands: [
      "TISSOT", "RADO", "GUESS", "USPA", "TIMEX", "TIMBERLAND",
      "TAG Heuer", "POLICE", "ORIS", "NAUTICA", "FENDI", "DIOR", "DANISH DESIGN"
    ]
  },
  {
    name: "Fashion",
    brands: ["PEDRO", "CHARLES & KEITH"]
  },
  {
    name: "Speed Sports",
    brands: ["PUMA", "NIKE", "BIRKENSTOCK", "ASICS", "ADIDAS", "UNDER ARMOUR"]
  }
];

export function UserBrandsModal({
  userId,
  userName,
  open,
  onOpenChange,
}: UserBrandsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [allBrands, setAllBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    if (open && userId) {
      loadData();
    }
  }, [open, userId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [brandsRes, userBrandsRes] = await Promise.all([
        brandApi.getAll(),
        getUserBrands(userId),
      ]);
      if (brandsRes.status) {
        setAllBrands(brandsRes.data || []);
      }
      if (userBrandsRes.status) {
        setSelectedBrands((userBrandsRes.data || []).map((b: any) => b.id));
      }
    } catch (error) {
      toast.error("Failed to load brands data");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateUserBrands(userId, selectedBrands);
      if (result.status) {
        toast.success(result.message || "Brands assigned successfully");
        onOpenChange(false);
      } else {
        toast.error(result.message || "Failed to assign brands");
      }
    });
  }

  const handleToggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSelectGroup = (groupBrands: string[]) => {
    const brandIdsToSelect = allBrands
      .filter(b => groupBrands.some(gb => b.name.toLowerCase() === gb.toLowerCase()))
      .map(b => b.id);
    
    setSelectedBrands(prev => {
      const newSelection = new Set(prev);
      brandIdsToSelect.forEach(id => newSelection.add(id));
      return Array.from(newSelection);
    });
  };

  const handleClearAll = () => {
    setSelectedBrands([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Brands</DialogTitle>
          <DialogDescription>
            Assign brands to <b>{userName}</b>. They will only be able to view and manage data related to these brands.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allBrands.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              No brands found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold flex items-center">
                    <Tags className="h-4 w-4 mr-2" />
                    Quick Selection
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BRAND_GROUPS.map((group) => (
                    <Button
                      key={group.name}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSelectGroup(group.brands)}
                      className="h-7 text-xs rounded-full border border-border shadow-sm hover:border-primary/50 transition-colors"
                    >
                      {group.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="text-sm font-semibold mb-3">All Brands ({selectedBrands.length} selected)</div>
                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {allBrands.map((brand) => (
                    <div key={brand.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`brand-${brand.id}`}
                        checked={selectedBrands.includes(brand.id)}
                        onCheckedChange={() => handleToggleBrand(brand.id)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`brand-${brand.id}`}
                        className="text-sm font-medium leading-tight cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {brand.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || isLoading}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
