"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Send,
  AlertCircle,
  CheckCircle2,
  Printer,
  Loader2,
  ArrowLeft,
  Trash2,
  ScanBarcode,
  FileSpreadsheet,
  Minus,
  Plus,
  CircleDot,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { createTransferRequest } from "@/lib/actions/transfer-request";
import { getLocations, Location } from "@/lib/actions/location";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";
import { authFetch } from "@/lib/auth";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DirectTransferBulkUploadModal,
  DirectTransferImportItem,
} from "@/components/pos/inventory/direct-transfer-bulk-upload-modal";
import { Autocomplete } from "@/components/ui/autocomplete";

export interface DirectTransferDraft {
  draftId: string;
  destinationId: string;
  destinationName?: string;
  items: TransferItem[];
  notes: string;
  dispatchDetails: {
    courierName: string;
    trackingNumber: string;
    vehicleNumber: string;
    riderName: string;
  };
  updatedAt: string;
}

const generateDraftId = () => {
  const now = new Date();
  const yr = now.getFullYear().toString().slice(-2);
  const mo = (now.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DTO-${yr}${mo}-${rand}`;
};

interface TransferItem {
  id: string;
  sku: string;
  uniqueNo?: string;
  barCode?: string;
  description: string;
  size?: string;
  color?: string;
  availableStock: number;
  quantity: number;
}

function DirectTransferForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial item details from query parameters
  const itemId = searchParams?.get("itemId") || "";
  const sku = searchParams?.get("sku") || "";
  const description = searchParams?.get("description") || "";
  const size = searchParams?.get("size") || "";
  const color = searchParams?.get("color") || "";
  const availableStock = parseFloat(searchParams?.get("availableStock") || "0");

  const [draftId, setDraftId] = useState<string>(() => {
    const urlDraftId = searchParams?.get("draftId");
    return urlDraftId || generateDraftId();
  });
  const [localDrafts, setLocalDrafts] = useState<DirectTransferDraft[]>([]);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState("");
  const [dispatchDetails, setDispatchDetails] = useState({ courierName: '', trackingNumber: '', vehicleNumber: '', riderName: '' });

  const handleDispatchChange = (field: string, value: string) => {
      setDispatchDetails(prev => ({ ...prev, [field]: value }));
  };
  const [destinations, setDestinations] = useState<Location[]>([]);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const handleCsvImportComplete = useCallback(
    (importedItems: DirectTransferImportItem[]) => {
      setItems((prev) => {
        const updated = [...prev];
        importedItems.forEach((newItem) => {
          const existingIndex = updated.findIndex((i) => i.id === newItem.id);
          if (existingIndex > -1) {
            const newQty = updated[existingIndex].quantity + newItem.quantity;
            updated[existingIndex].quantity = Math.min(
              newQty,
              newItem.availableStock,
            );
          } else {
            updated.push({
              id: newItem.id,
              sku: newItem.sku,
              description: newItem.description,
              size: newItem.size,
              color: newItem.color,
              availableStock: newItem.availableStock,
              quantity: newItem.quantity,
            });
          }
        });
        return updated;
      });
      toast.success(`${importedItems.length} item(s) imported from CSV/Excel.`);
    },
    [],
  );

  // Search bar states & scanner refs
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = React.useRef<number>(0);
  const isScannerInputRef = React.useRef<boolean>(false);
  const isScanningRef = React.useRef<boolean>(false);
  const globalScannerBuffer = React.useRef<string>("");
  const globalScannerLastCharTime = React.useRef<number>(0);
  const globalScannerTimer = React.useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const fromLocationId = user?.terminal?.location?.id || user?.locationId;

  // Load drafts from localStorage
  const loadLocalDrafts = useCallback(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("direct-transfer-drafts");
      if (raw) {
        const parsed = JSON.parse(raw);
        const list: DirectTransferDraft[] = Object.values(parsed);
        list.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setLocalDrafts(list);
        return list;
      }
    } catch (err) {
      console.error("Error loading direct transfer drafts", err);
    }
    setLocalDrafts([]);
    return [];
  }, []);

  // Verify live stock from current outlet location
  const verifyStockForItems = useCallback(
    async (currentItems: TransferItem[], locId: string): Promise<TransferItem[]> => {
      if (!currentItems.length || !locId) return currentItems;

      try {
        const res = await authFetch("/pos-sales/check-stock", {
          method: "POST",
          body: JSON.stringify({
            itemIds: currentItems.map((i) => i.id),
            locationId: locId,
          }),
        });

        if (res.ok && res.data?.status && res.data.data) {
          const liveStockMap: Record<string, number> = res.data.data;
          const outOfStockItems: TransferItem[] = [];
          const adjustedItems: { item: TransferItem; oldQty: number; newQty: number }[] = [];

          const updated = currentItems.map((item) => {
            const liveStock =
              liveStockMap[item.id] !== undefined ? liveStockMap[item.id] : 0;

            if (liveStock <= 0) {
              outOfStockItems.push({ ...item, availableStock: 0 });
              return { ...item, availableStock: 0, quantity: 0 };
            }

            let newQty = item.quantity;
            if (item.quantity > liveStock) {
              adjustedItems.push({
                item,
                oldQty: item.quantity,
                newQty: liveStock,
              });
              newQty = liveStock;
            }

            return {
              ...item,
              availableStock: liveStock,
              quantity: newQty,
            };
          });

          if (outOfStockItems.length > 0) {
            const skus = outOfStockItems
              .map((i) => i.sku || i.barCode || i.description)
              .join(", ");
            toast.error(
              `⚠️ Stock Alert: ${outOfStockItems.length} item(s) (${skus}) are OUT OF STOCK (sold out) and removed from this transfer!`,
              { duration: 8000 },
            );
          }

          if (adjustedItems.length > 0) {
            adjustedItems.forEach(({ item, oldQty, newQty }) => {
              toast.warning(
                `Quantity for ${item.sku} adjusted from ${oldQty} to ${newQty} based on current available stock.`,
                { duration: 6000 },
              );
            });
          }

          // Filter out sold-out (0 stock) items so they cannot be transferred
          const validItems = updated.filter((i) => i.availableStock > 0);
          return validItems;
        }
      } catch (err) {
        console.error("Error verifying live stock:", err);
      }
      return currentItems;
    },
    [],
  );

  const applyDraft = useCallback(
    async (draft: DirectTransferDraft) => {
      setDraftId(draft.draftId);
      setSelectedDestId(draft.destinationId || "");
      setNotes(draft.notes || "");
      setDispatchDetails(
        draft.dispatchDetails || {
          courierName: "",
          trackingNumber: "",
          vehicleNumber: "",
          riderName: "",
        },
      );
      setLastSavedTime(new Date(draft.updatedAt));

      const initialItems = draft.items || [];
      if (!initialItems.length) {
        setItems([]);
        return;
      }

      if (fromLocationId) {
        const toastId = toast.loading("Checking live outlet stock...");
        const validated = await verifyStockForItems(initialItems, fromLocationId);
        toast.dismiss(toastId);
        setItems(validated);

        if (validated.length > 0) {
          toast.success(`Draft restored (${validated.length} item(s) available)`);
        } else {
          toast.error("Draft restored, but all item(s) were sold out and cannot be transferred.", {
            duration: 8000,
          });
        }
      } else {
        setItems(initialItems);
      }
    },
    [fromLocationId, verifyStockForItems],
  );

  // Automatically re-verify items stock when fromLocationId is resolved
  useEffect(() => {
    if (fromLocationId && items.length > 0) {
      verifyStockForItems(items, fromLocationId).then((validated) => {
        if (validated.length !== items.length) {
          setItems(validated);
        }
      });
    }
  }, [fromLocationId]);

  const handleDiscardDraft = useCallback(
    (idToDiscard: string) => {
      try {
        const raw = localStorage.getItem("direct-transfer-drafts");
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed[idToDiscard];
          localStorage.setItem(
            "direct-transfer-drafts",
            JSON.stringify(parsed),
          );
          loadLocalDrafts();

          if (draftId === idToDiscard) {
            setItems([]);
            setSelectedDestId("");
            setNotes("");
            setDispatchDetails({
              courierName: "",
              trackingNumber: "",
              vehicleNumber: "",
              riderName: "",
            });
            setDraftId(generateDraftId());
            setLastSavedTime(null);
          }
          toast.success("Draft discarded");
        }
      } catch (e) {
        console.error("Failed to discard draft", e);
      }
    },
    [draftId, loadLocalDrafts],
  );

  // Restore draft on mount (matching journal voucher flow)
  useEffect(() => {
    const allDrafts = loadLocalDrafts();
    const urlDraftId = searchParams?.get("draftId");

    if (urlDraftId) {
      const target = allDrafts.find((d) => d.draftId === urlDraftId);
      if (target) {
        applyDraft(target);
        toast.success(`Restored draft: ${target.draftId}`);
        return;
      }
    }

    if (itemId) return;

    if (allDrafts.length === 1) {
      const single = allDrafts[0];
      const hasContent =
        single.items?.length > 0 ||
        single.notes ||
        single.destinationId ||
        single.dispatchDetails?.courierName;

      if (hasContent) {
        const totalUnits =
          single.items?.reduce(
            (sum, i) => sum + (Number(i.quantity) || 0),
            0,
          ) || 0;
        toast(
          `You have an unsaved draft (${single.draftId}) with ${single.items?.length || 0} item(s) (${totalUnits} unit(s)).`,
          {
            action: {
              label: "Restore",
              onClick: () => {
                applyDraft(single);
                toast.success("Draft restored!");
              },
            },
            cancel: {
              label: "Discard",
              onClick: () => {
                handleDiscardDraft(single.draftId);
              },
            },
            duration: 15000,
          },
        );
      }
    } else if (allDrafts.length > 1) {
      toast(`You have ${allDrafts.length} unsaved direct transfer drafts.`, {
        action: {
          label: "View Drafts",
          onClick: () => {
            const el = document.getElementById("unsaved-drafts-section");
            el?.scrollIntoView({ behavior: "smooth" });
          },
        },
        duration: 15000,
      });
    }
  }, []);

  // Debounced auto-save draft logic (1000ms, matching journal voucher)
  useEffect(() => {
    if (isSuccess || !draftId) return;

    const hasItems = items.length > 0;
    const hasDest = !!selectedDestId;
    const hasNotes = !!notes.trim();
    const hasDispatch =
      !!dispatchDetails.courierName ||
      !!dispatchDetails.trackingNumber ||
      !!dispatchDetails.vehicleNumber ||
      !!dispatchDetails.riderName;

    const hasContent = hasItems || hasDest || hasNotes || hasDispatch;

    if (!hasContent) {
      // Clean empty draft from storage
      try {
        const raw = localStorage.getItem("direct-transfer-drafts");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed[draftId]) {
            delete parsed[draftId];
            localStorage.setItem(
              "direct-transfer-drafts",
              JSON.stringify(parsed),
            );
            loadLocalDrafts();
          }
        }
      } catch {}
      return;
    }

    setIsSavingDraft(true);
    const timeout = setTimeout(() => {
      try {
        const raw = localStorage.getItem("direct-transfer-drafts") || "{}";
        const drafts = JSON.parse(raw);
        const destName = destinations.find((d) => d.id === selectedDestId)?.name;

        drafts[draftId] = {
          draftId,
          destinationId: selectedDestId,
          destinationName: destName,
          items,
          notes,
          dispatchDetails,
          updatedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          "direct-transfer-drafts",
          JSON.stringify(drafts),
        );
        setLastSavedTime(new Date());
        setIsSavingDraft(false);
        loadLocalDrafts();
      } catch (e) {
        console.error("Error auto-saving direct transfer draft", e);
        setIsSavingDraft(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    items,
    selectedDestId,
    notes,
    dispatchDetails,
    draftId,
    destinations,
    isSuccess,
    loadLocalDrafts,
  ]);

  // Load initial item if present in search params
  useEffect(() => {
    if (itemId) {
      setItems([
        {
          id: itemId,
          sku: sku,
          description: description,
          size: size,
          color: color,
          availableStock: availableStock,
          quantity: 1,
        },
      ]);
    }
  }, [itemId, sku, description, size, color, availableStock]);

  useEffect(() => {
    if (fromLocationId) {
      fetchDestinations();
    }
  }, [fromLocationId]);

  async function fetchDestinations() {
    setIsLoadingDestinations(true);
    try {
      const res = await getLocations();
      if (res.status && res.data) {
        // Find current location to get its registered brands
        const currentLocation = res.data.find((l) => l.id === fromLocationId);
        const currentBrandIds = currentLocation?.brands?.map((b) => b.id) || [];

        // Filter out current location and keep active locations
        // Also only include locations that share at least one registered brand with the current location
        const filtered = res.data.filter(
          (loc) => {
            if (loc.id === fromLocationId || loc.status !== "active") return false;
            
            // If current location has brands, filter by same brands
            if (currentBrandIds.length > 0) {
              const locBrandIds = loc.brands?.map((b) => b.id) || [];
              return locBrandIds.some((id) => currentBrandIds.includes(id));
            }
            
            return true; // Fallback if no brands are registered
          }
        );
        setDestinations(filtered);
      } else {
        toast.error("Failed to load destination outlets");
      }
    } catch (error) {
      console.error("Failed to load destinations", error);
      toast.error("An error occurred while loading destination outlets");
    } finally {
      setIsLoadingDestinations(false);
    }
  }

  // Reset active index when search results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults, searchQuery]);

  const handleSelectProduct = useCallback((product: any) => {
    const prodSize =
      typeof product.size === "object" ? product.size?.name : product.size;
    const prodColor =
      typeof product.color === "object" ? product.color?.name : product.color;
    const prodStock = Number(product.stockQty) || 0;

    if (prodStock <= 0) {
      toast.warning(
        `Item ${product.sku || product.barCode} has no available stock in your outlet.`,
      );
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity + 1 > prodStock) {
          toast.error(`Only ${prodStock} units available in stock`);
          return prev;
        }
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          sku: product.sku || product.barCode || "-",
          uniqueNo: product.uniqueNo || "",
          barCode: product.barCode || "",
          description: product.description || "Unknown Item",
          size: prodSize || "",
          color: prodColor || "",
          availableStock: prodStock,
          quantity: 1,
        },
      ];
    });

    setSearchQuery("");
    setSearchResults([]);
    setActiveIndex(-1);
    isScanningRef.current = false;
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, []);

  const handleSearchChange = (value: string) => {
    const now = Date.now();
    const timeDiff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // Detect rapid scanner keystrokes (< 50ms) or bulk paste/scan (> 2 chars jump)
    if (timeDiff < 50 || value.length - searchQuery.length > 2) {
      isScannerInputRef.current = true;
    } else {
      isScannerInputRef.current = false;
    }

    setSearchQuery(value);
  };

  // Debounced Live Search with instant auto-add for Barcodes
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Fast scanner input uses 50ms debounce; manual typing uses 250ms
    const delay = isScannerInputRef.current ? 50 : 250;

    const timer = setTimeout(async () => {
      if (isScanningRef.current) return;

      // 1. Instant scan check: if scanner input or query is numeric barcode (>= 6 digits)
      const isNumericBarcode = /^\d{6,}$/.test(query);
      if (isScannerInputRef.current || isNumericBarcode) {
        try {
          isScanningRef.current = true;
          const scanRes = await authFetch(`/pos-sales/scan`, {
            params: { barcode: query },
          });
          if (scanRes.ok && scanRes.data?.status && scanRes.data.data) {
            const product = scanRes.data.data;
            handleSelectProduct(product);
            toast.success(
              `Scanned: ${product.description || product.sku || "Product"}`,
            );
            return;
          }
        } catch {
          // Fall through to regular lookup
        } finally {
          isScanningRef.current = false;
        }
      }

      // 2. Regular lookup for SKU, article name, or manual search
      // When searching by SKU, do NOT auto-add: show all barcodes/variants under that SKU in dropdown
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const res = await authFetch(`/pos-sales/lookup`, {
            params: { q: query },
          });
          if (res.ok && res.data?.status && res.data.data) {
            const results = res.data.data;

            // Only auto-add if scanner input or numeric barcode had an exact BARCODE match (NOT SKU)
            if (isScannerInputRef.current || isNumericBarcode) {
              const exactBarcodeMatch = results.find(
                (p: any) =>
                  p.barCode &&
                  p.barCode.trim().toLowerCase() === query.toLowerCase(),
              );
              if (exactBarcodeMatch) {
                handleSelectProduct(exactBarcodeMatch);
                toast.success(
                  `Scanned: ${exactBarcodeMatch.description || exactBarcodeMatch.sku || "Product"}`,
                );
                return;
              }
            }

            // For SKU or text search: Always show dropdown with all variants/barcodes so user can select manually
            setSearchResults(results);
          } else {
            setSearchResults([]);
          }
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSelectProduct]);

  // Global Barcode Scanner Listener
  useEffect(() => {
    const processBuffer = async (barcode: string) => {
      if (barcode.length < 3 || isScanningRef.current) return;
      isScanningRef.current = true;
      try {
        const res = await authFetch(`/pos-sales/scan`, {
          params: { barcode },
        });
        if (res.ok && res.data?.status && res.data.data) {
          handleSelectProduct(res.data.data);
          toast.success(
            `Scanned: ${res.data.data.description || res.data.data.name || "Product"}`,
          );
        } else {
          const lookupRes = await authFetch(`/pos-sales/lookup`, {
            params: { q: barcode },
          });
          if (
            lookupRes.ok &&
            lookupRes.data?.status &&
            lookupRes.data.data?.length > 0
          ) {
            const found = lookupRes.data.data[0];
            handleSelectProduct(found);
            toast.success(
              `Scanned: ${found.description || found.name || "Product"}`,
            );
          } else {
            toast.error(res.data?.message || "Item not found");
          }
        }
      } catch {
        toast.error("Failed to scan item. Check connection.");
      } finally {
        isScanningRef.current = false;
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (isInputFocused) return;
      if (e.key.length > 1 && e.key !== "Enter") return;

      const now = Date.now();
      if (now - globalScannerLastCharTime.current > 100) {
        globalScannerBuffer.current = "";
      }
      globalScannerLastCharTime.current = now;

      if (globalScannerTimer.current) {
        clearTimeout(globalScannerTimer.current);
      }

      if (e.key === "Enter") {
        if (globalScannerBuffer.current.length >= 3) {
          e.preventDefault();
          const barcode = globalScannerBuffer.current;
          globalScannerBuffer.current = "";
          processBuffer(barcode);
        } else {
          globalScannerBuffer.current = "";
        }
      } else {
        globalScannerBuffer.current += e.key;
        if (globalScannerBuffer.current.length >= 6) {
          globalScannerTimer.current = setTimeout(() => {
            const barcode = globalScannerBuffer.current;
            globalScannerBuffer.current = "";
            processBuffer(barcode);
          }, 70);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      if (globalScannerTimer.current) clearTimeout(globalScannerTimer.current);
    };
  }, [handleSelectProduct]);

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim() || isScanningRef.current) return;
    isScanningRef.current = true;
    const query = searchQuery.trim();
    try {
      const res = await authFetch(`/pos-sales/scan`, {
        params: { barcode: query },
      });
      if (res.ok && res.data?.status && res.data.data) {
        handleSelectProduct(res.data.data);
      } else if (searchResults.length === 1) {
        handleSelectProduct(searchResults[0]);
      } else if (searchResults.length > 1) {
        // Multiple variants under SKU: Keep dropdown open for user to choose
        return;
      } else {
        const lookupRes = await authFetch(`/pos-sales/lookup`, {
          params: { q: query },
        });
        if (
          lookupRes.ok &&
          lookupRes.data?.status &&
          lookupRes.data.data?.length === 1
        ) {
          handleSelectProduct(lookupRes.data.data[0]);
        } else if (
          lookupRes.ok &&
          lookupRes.data?.status &&
          lookupRes.data.data?.length > 1
        ) {
          setSearchResults(lookupRes.data.data);
          return;
        } else {
          toast.error(res.data?.message || "Item not found");
        }
      }
    } catch {
      toast.error("Failed to scan item. Check connection.");
    } finally {
      isScanningRef.current = false;
    }
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + searchResults.length) % searchResults.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
        handleSelectProduct(searchResults[activeIndex]);
        setActiveIndex(-1);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setActiveIndex(-1);
    }
  };

  const handleQtyChange = (id: string, qty: string) => {
    const val = parseFloat(qty);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (isNaN(val) || val <= 0) {
          return { ...item, quantity: 0 };
        }
        if (val > item.availableStock) {
          toast.error(
            `Cannot transfer more than available stock (${item.availableStock} units)`,
          );
          return { ...item, quantity: item.availableStock };
        }
        return { ...item, quantity: val };
      }),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId) return;

    if (items.length === 0) {
      toast.error("Please add at least one item to transfer");
      return;
    }

    if (!selectedDestId) {
      toast.error("Please select a destination outlet");
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`Please enter a valid quantity for item ${item.sku}`);
        return;
      }
      if (item.quantity > item.availableStock || item.availableStock <= 0) {
        toast.error(
          `Cannot transfer item ${item.sku}: available stock is ${item.availableStock} units`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    // Pre-flight check: Re-verify live stock immediately before submitting
    try {
      const liveStockRes = await authFetch("/pos-sales/check-stock", {
        method: "POST",
        body: JSON.stringify({
          itemIds: items.map((i) => i.id),
          locationId: fromLocationId,
        }),
      });

      if (liveStockRes.ok && liveStockRes.data?.status && liveStockRes.data.data) {
        const liveMap: Record<string, number> = liveStockRes.data.data;
        for (const item of items) {
          const live = liveMap[item.id] !== undefined ? liveMap[item.id] : item.availableStock;
          if (live <= 0) {
            toast.error(
              `Cannot transfer "${item.sku}": Item was recently sold out (0 available in your outlet).`,
            );
            setItems((prev) => prev.filter((p) => p.id !== item.id));
            setIsSubmitting(false);
            return;
          }
          if (item.quantity > live) {
            toast.error(
              `Cannot transfer ${item.quantity} units of "${item.sku}". Only ${live} available in outlet.`,
            );
            setItems((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, availableStock: live, quantity: live } : p)),
            );
            setIsSubmitting(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Pre-flight stock check error:", e);
    }

    try {
      const res = await createTransferRequest({
        fromLocationId: fromLocationId,
        toLocationId: selectedDestId,
        transferType: "OUTLET_TO_OUTLET",
        isDirectTransfer: true,
        items: items.map((item) => ({
          itemId: item.id,
          quantity: item.quantity,
        })),
        notes,
        courierName: dispatchDetails.courierName,
        trackingNumber: dispatchDetails.trackingNumber,
        vehicleNumber: dispatchDetails.vehicleNumber,
        riderName: dispatchDetails.riderName,
      });

      if (res.status) {
        // Clean submitted draft from localStorage
        try {
          const raw = localStorage.getItem("direct-transfer-drafts");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed[draftId]) {
              delete parsed[draftId];
              localStorage.setItem(
                "direct-transfer-drafts",
                JSON.stringify(parsed),
              );
              loadLocalDrafts();
            }
          }
        } catch {}

        setCreatedRequest(res.data);
        setIsSuccess(true);
        toast.success(
          res.message || "Direct transfer out created successfully!",
        );
      } else {
        toast.error(res.message || "Failed to create transfer request");
      }
    } catch (error: any) {
      console.error("Direct transfer error:", error);
      toast.error(
        error.message || "An error occurred while creating direct transfer",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintCreatedRequest = () => {
    if (!createdRequest) return;
    const refNo = createdRequest.requestNo || "N/A";
    const typeTitle = "DIRECT OUTLET-TO-OUTLET TRANSFER OUT";
    const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const win = iframe.contentWindow;
        if (!win) {
            toast.error("Failed to create print frame");
            setPrintingId(null);
            return;
        }

    const dateStr = format(new Date(), "dd MMM yyyy HH:mm");
    const companyName = "Speed (pvt.) Limited";
    const sourceLoc = user?.terminal?.location?.name || "This Outlet";
    const destLoc =
      destinations.find((d) => d.id === selectedDestId)?.name ||
      "Destination Outlet";

    const itemsHtml = items
      .map(
        (item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="font-bold">${item.sku || "—"}</td>
                <td>${item.description || "Item"}</td>
                <td>${item.size || "—"}</td>
                <td>${item.color || "—"}</td>
                <td class="text-right font-bold">${item.quantity}</td>
            </tr>
        `,
      )
      .join("");

    win.document.write(`
            <html><head><title>Transfer Out - ${refNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; padding: 40px; }
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #065f46; letter-spacing: 1px; }
                .document-title { font-size: 14px; font-weight: 600; color: #4b5563; text-transform: uppercase; margin-top: 4px; }
                .status-badge { padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid; display: inline-block; }
                .status-approved { background-color: #d1fae5; color: #065f46; border-color: #10b981; }
                
                .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                
                .notes-section { background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 40px; border-radius: 0 8px 8px 0; }
                .notes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
                .notes-content { font-size: 12px; color: #334155; }
                
                .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 60px; }
                .signature-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
                
                @media print {
                    body { padding: 0; }
                    .meta-grid { background-color: #fff !important; border: 1px solid #cbd5e1; }
                    th { background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style></head><body>
                <div class="header-container">
                    <div>
                        <div class="company-name">${companyName}</div>
                        <div class="document-title">${typeTitle}</div>
                    </div>
                    <div>
                        <span class="status-badge status-approved">SOURCE APPROVED / OUTBOUND</span>
                    </div>
                </div>
                
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Reference No</span>
                        <span class="meta-value">${refNo}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Transfer Date</span>
                        <span class="meta-value">${dateStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Source Outlet</span>
                        <span class="meta-value">${sourceLoc}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Destination Outlet</span>
                        <span class="meta-value">${destLoc}</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">S.No</th>
                            <th>SKU Code</th>
                            <th>Item Description</th>
                            <th>Size</th>
                            <th>Color</th>
                            <th class="text-right" style="width: 100px;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                ${
                  notes
                    ? `
                    <div class="notes-section">
                        <div class="notes-title">Transfer Notes / Remarks</div>
                        <div class="notes-content">${notes}</div>
                    </div>
                `
                    : ""
                }
                
                <div class="signature-grid">
                    <div class="signature-box">Prepared By</div>
                    <div class="signature-box">Source Authorized By</div>
                    <div class="signature-box">Received By</div>
                </div>
            </body></html>
        `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push("/pos/inventory/view");
    }
  };

  if (!fromLocationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="max-w-md p-6 bg-card border rounded-2xl shadow-xl space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-foreground">
            Resolving Outlet Location
          </h3>
          <p className="text-muted-foreground text-sm">
            Verifying your outlet terminal context. Please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Direct Transfer Out
            </h1>
            <p className="text-sm text-muted-foreground">
              Outlet to Outlet direct transfer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Draft: <strong className="text-foreground">{draftId}</strong>
              </span>
              {lastSavedTime && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {isSavingDraft
                    ? "Saving draft..."
                    : `Auto-saved at ${format(lastSavedTime, "hh:mm:ss a")}`}
                </span>
              )}
            </div>
            {(items.length > 0 || notes || selectedDestId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDiscardDraft(draftId)}
                className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-10"
              >
                Clear Form
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setCsvImportOpen(true)}
              className="gap-2 h-10"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Bulk Upload
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-20 overflow-auto">
        <div className="max-w-7xl mx-auto w-full">
          {isSuccess ? (
            <div className="max-w-xl mx-auto">
              <Card className="border border-border/80 shadow-2xl overflow-hidden rounded-2xl bg-card">
                <CardContent className="p-6">
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground">
                        Transfer Sent Out Successfully!
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        Stock has been decremented from your outlet and sent to
                        destination's inbound queue.
                      </p>
                    </div>

                    {createdRequest && (
                      <div className="p-4 bg-muted/40 rounded-xl w-full border font-mono text-xs space-y-3 text-left">
                        <div className="flex justify-between border-b pb-2 border-border/50">
                          <span className="text-muted-foreground font-semibold">
                            Ref No:
                          </span>
                          <span className="font-bold text-foreground">
                            {createdRequest.requestNo || "N/A"}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          <span className="text-muted-foreground font-semibold block mb-1">
                            Transferred Items:
                          </span>
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-[11px]"
                            >
                              <span className="truncate max-w-[200px] text-foreground" title={`${item.sku} - ${item.description}`}>
                                {item.sku} - {item.description}
                                {item.barCode && ` (${item.barCode})`}
                                {item.uniqueNo && ` (${item.uniqueNo})`}
                              </span>
                              <span className="font-bold text-foreground flex-none ml-2">
                                {item.quantity} Units
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between border-t pt-2 border-border/50">
                          <span className="text-muted-foreground font-semibold">
                            Destination:
                          </span>
                          <span className="font-bold text-foreground truncate max-w-[200px]">
                            {destinations.find((d) => d.id === selectedDestId)
                              ?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">
                            Status:
                          </span>
                          <span className="font-bold text-emerald-600">
                            SOURCE APPROVED
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 w-full pt-4">
                      <Button
                        type="button"
                        className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handlePrintCreatedRequest}
                      >
                        <Printer className="h-4 w-4" /> Print Transfer Slip
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        className="w-full h-11 font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setIsSuccess(false);
                          setCreatedRequest(null);
                          setItems([]);
                          setSelectedDestId("");
                          setNotes("");
                          setDispatchDetails({
                            courierName: "",
                            trackingNumber: "",
                            vehicleNumber: "",
                            riderName: "",
                          });
                          setDraftId(generateDraftId());
                          setLastSavedTime(null);
                        }}
                      >
                        <Plus className="h-4 w-4" /> Create Another Direct Transfer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 font-bold"
                        onClick={handleClose}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unsaved Drafts Banner (Matching Journal Voucher) */}
              {localDrafts.length > 0 && (
                <div
                  id="unsaved-drafts-section"
                  className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <h3 className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm uppercase tracking-wider">
                        Unsaved Drafts ({localDrafts.length})
                      </h3>
                    </div>
                    <p className="text-xs text-amber-700/90 dark:text-amber-400/80">
                      Saved in browser local storage to prevent data loss
                    </p>
                  </div>
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {localDrafts.map((draft) => {
                      const totalUnits =
                        draft.items?.reduce(
                          (sum, i) => sum + (Number(i.quantity) || 0),
                          0,
                        ) || 0;
                      const isCurrentlyActive = draft.draftId === draftId;
                      return (
                        <div
                          key={draft.draftId}
                          className={cn(
                            "flex flex-col justify-between p-3.5 rounded-lg border bg-white/90 dark:bg-card shadow-xs transition-all duration-200 hover:shadow-sm space-y-3",
                            isCurrentlyActive
                              ? "border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/30 dark:bg-amber-950/30"
                              : "border-amber-200/60 dark:border-amber-900/40",
                          )}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {draft.draftId}
                                </span>
                                {isCurrentlyActive && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-300"
                                  >
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {format(
                                  new Date(draft.updatedAt),
                                  "dd MMM, hh:mm a",
                                )}
                              </span>
                            </div>
                            <div className="text-xs text-foreground font-semibold truncate">
                              {draft.destinationName
                                ? `To: ${draft.destinationName}`
                                : "Destination: Not selected"}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {draft.items?.length || 0} item(s)
                              </span>
                              <span>•</span>
                              <span>{totalUnits} unit(s)</span>
                            </div>
                            {draft.notes && (
                              <p className="text-[11px] text-muted-foreground italic truncate">
                                &ldquo;{draft.notes}&rdquo;
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                            {!isCurrentlyActive ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  applyDraft(draft);
                                  toast.success(
                                    `Resumed draft ${draft.draftId}`,
                                  );
                                }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-200 font-bold h-7 text-xs"
                              >
                                Resume
                              </Button>
                            ) : (
                              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-400">
                                Editing in form
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDiscardDraft(draft.draftId)
                              }
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              Discard
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Search Bar */}
              <div className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm relative z-50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex flex-col gap-1 pr-4 border-r border-border/50 hidden lg:flex">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Product Entry
                    </span>
                    <span className="text-[9px] font-medium text-primary uppercase font-mono">
                      Search / Scan Item
                    </span>
                  </div>

                  <div className="relative flex-1">
                    <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Scan Barcode / Search Product by Name or SKU..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-9 bg-muted/30 border-input h-11 w-full text-sm"
                      autoFocus
                    />

                    {/* Autocomplete Dropdown */}
                    {searchQuery.trim().length > 0 &&
                      (searchResults.length > 0 || isSearching) && (
                        <div className="absolute left-0 right-0 top-13 bg-popover border border-border shadow-md rounded-md overflow-hidden z-[500] max-h-64 overflow-y-auto">
                          {isSearching ? (
                            <div className="p-3 text-sm text-muted-foreground flex items-center justify-center">
                              Searching...
                            </div>
                          ) : (
                            <ul className="flex flex-col">
                              {searchResults.map((product, idx) => (
                                <li
                                  key={product.id}
                                  className={cn(
                                    "px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0 transition-colors",
                                    idx === activeIndex &&
                                      "bg-primary/10 border-l-4 border-l-primary",
                                  )}
                                  onClick={() => handleSelectProduct(product)}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <span className="text-sm font-normal text-foreground">
                                        {product.description || "Unknown Item"}
                                      </span>
                                      {(typeof product.size === "object"
                                        ? product.size?.name
                                        : product.size) && (
                                        <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                          Size:{" "}
                                          <strong className="font-bold text-foreground">
                                            {typeof product.size === "object"
                                              ? product.size?.name
                                              : product.size}
                                          </strong>
                                        </span>
                                      )}
                                      {(typeof product.color === "object"
                                        ? product.color?.name
                                        : product.color) && (
                                        <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                          Color:{" "}
                                          <span className="font-medium text-foreground">
                                            {typeof product.color === "object"
                                              ? product.color?.name
                                              : product.color}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      <span className="text-xs text-muted-foreground font-mono">
                                        SKU:{" "}
                                        <strong className="font-bold text-foreground">
                                          {product.sku || product.barCode || "-"}
                                        </strong>
                                      </span>
                                      {product.uniqueNo && (
                                        <span className="text-[10px] text-purple-600 font-mono">
                                          Unique No: <strong className="font-bold">{product.uniqueNo}</strong>
                                        </span>
                                      )}
                                      {product.barCode && product.barCode !== product.sku && (
                                        <span className="text-[10px] text-blue-600 font-mono">
                                          Barcode: <strong className="font-bold">{product.barCode}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-sm font-bold">
                                      {formatCurrency(product.unitPrice || 0)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {product.stockQty !== undefined && (
                                        <span
                                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${product.stockQty <= 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}
                                        >
                                          Stock: {product.stockQty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Items Data Table */}
                <div className="lg:col-span-7 xl:col-span-8">
                  <Card className="border border-border/80 shadow-sm overflow-hidden rounded-xl bg-card">
                    <CardHeader className="bg-muted/20 border-b border-border/60 px-5 py-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold tracking-tight">
                          Transfer Items
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Review and adjust quantities of items to transfer
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md">
                          {items.length} Item{items.length !== 1 ? "s" : ""}
                        </span>
                        {items.length > 0 && (
                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800">
                            {items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} Total Units
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {items.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground/60 space-y-3">
                          <div className="rounded-full bg-muted/50 p-4 w-16 h-16 mx-auto flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            No products selected yet
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Scan a barcode or search by SKU/name in the entry bar above to add products for direct transfer.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-[45px] text-center font-semibold text-xs uppercase tracking-wider">
                                  #
                                </TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wider min-w-[130px]">
                                  Barcode / SKU
                                </TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wider min-w-[160px]">
                                  Item Description
                                </TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center min-w-[100px]">
                                  Size / Color
                                </TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center min-w-[85px]">
                                  Stock
                                </TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wider text-center min-w-[130px]">
                                  Transfer Qty
                                </TableHead>
                                <TableHead className="w-[45px] text-center" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item, index) => (
                                <TableRow
                                  key={item.id}
                                  className="group hover:bg-muted/30 transition-colors"
                                >
                                  {/* # */}
                                  <TableCell className="text-center text-muted-foreground font-medium text-xs">
                                    {index + 1}
                                  </TableCell>

                                  {/* Barcode / SKU */}
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      {item.barCode ? (
                                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                          {item.barCode}
                                        </span>
                                      ) : null}
                                      <span className="font-bold text-xs font-mono text-foreground tracking-wide">
                                        {item.sku}
                                      </span>
                                      {item.uniqueNo ? (
                                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                                          #{item.uniqueNo}
                                        </span>
                                      ) : null}
                                    </div>
                                  </TableCell>

                                  {/* Item Description */}
                                  <TableCell>
                                    <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                                      {item.description || "Unknown Item"}
                                    </span>
                                  </TableCell>

                                  {/* Size / Color */}
                                  <TableCell className="text-center">
                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                      {item.size ? (
                                        <Badge
                                          variant="secondary"
                                          className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                                        >
                                          {item.size}
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                      {item.color ? (
                                        <span className="text-xs text-muted-foreground font-medium">
                                          {item.color}
                                        </span>
                                      ) : null}
                                    </div>
                                  </TableCell>

                                  {/* Stock status */}
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <CircleDot
                                        className={`h-3 w-3 ${
                                          item.availableStock > 0
                                            ? "text-emerald-500"
                                            : "text-rose-500"
                                        }`}
                                      />
                                      <span
                                        className={`text-xs font-semibold tabular-nums ${
                                          item.availableStock > 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-rose-600 dark:text-rose-400"
                                        }`}
                                      >
                                        {item.availableStock}
                                      </span>
                                    </div>
                                  </TableCell>

                                  {/* Quantity Controls */}
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handleQtyChange(
                                            item.id,
                                            String(Math.max(1, item.quantity - 1)),
                                          )
                                        }
                                        className="h-7 w-7 rounded-md"
                                        disabled={item.quantity <= 1}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={item.availableStock}
                                        value={item.quantity === 0 ? "" : item.quantity}
                                        onChange={(e) =>
                                          handleQtyChange(item.id, e.target.value)
                                        }
                                        className="h-8 w-14 text-center font-bold text-sm tabular-nums px-1 bg-background"
                                        required
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handleQtyChange(
                                            item.id,
                                            String(
                                              Math.min(
                                                item.availableStock,
                                                item.quantity + 1,
                                              ),
                                            ),
                                          )
                                        }
                                        className="h-7 w-7 rounded-md"
                                        disabled={item.quantity >= item.availableStock}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>

                                  {/* Action */}
                                  <TableCell className="text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                                      onClick={() => handleRemoveItem(item.id)}
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter className="bg-muted/30 border-t font-semibold">
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-right text-xs uppercase tracking-wider text-muted-foreground font-bold py-3"
                                >
                                  Total Transfer Units:
                                </TableCell>
                                <TableCell className="text-center text-sm font-bold font-mono text-primary py-3">
                                  {items.reduce(
                                    (sum, i) => sum + (Number(i.quantity) || 0),
                                    0,
                                  )}
                                </TableCell>
                                <TableCell />
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
                  <Card className="border border-border/80 shadow-lg overflow-hidden rounded-2xl bg-card">
                    <CardContent className="p-6">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-2">
                          <Label
                            htmlFor="destination"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            Select Destination Outlet
                          </Label>
                          {isLoadingDestinations ? (
                            <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-muted/20 text-muted-foreground text-sm">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span>Loading outlets...</span>
                            </div>
                          ) : (
                            <Autocomplete
                              options={destinations.map((dest) => ({
                                value: dest.id,
                                label: `${dest.name} (${dest.code})`,
                              }))}
                              value={selectedDestId}
                              onValueChange={setSelectedDestId}
                              placeholder="Choose target outlet..."
                              searchPlaceholder="Search outlets..."
                              emptyMessage={
                                destinations.length === 0
                                  ? "No other active outlets found"
                                  : "No outlet found matching search."
                              }
                              className="h-11 bg-muted/30"
                            />
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label
                            htmlFor="notes"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            Additional Notes (Optional)
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder="e.g. Stock sent for customer booking order"
                            className="resize-none focus-visible:ring-ring bg-muted/30 min-h-[80px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-border/50">
                            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-400">Dispatch / Courier Details (Optional)</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courier Name</label>
                                    <Input placeholder="e.g. TCS, Leopard" value={dispatchDetails.courierName} onChange={e => handleDispatchChange('courierName', e.target.value)} className="h-9 bg-muted/30 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracking Number</label>
                                    <Input placeholder="Tracking No." value={dispatchDetails.trackingNumber} onChange={e => handleDispatchChange('trackingNumber', e.target.value)} className="h-9 bg-muted/30 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rider Name</label>
                                    <Input placeholder="Name" value={dispatchDetails.riderName} onChange={e => handleDispatchChange('riderName', e.target.value)} className="h-9 bg-muted/30 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Number</label>
                                    <Input placeholder="e.g. ABC-123" value={dispatchDetails.vehicleNumber} onChange={e => handleDispatchChange('vehicleNumber', e.target.value)} className="h-9 bg-muted/30 text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                          <AlertCircle className="w-5 h-5 flex-none mt-0.5 text-emerald-600" />
                          <p className="leading-relaxed">
                            This transfer out will deduct stock from your outlet
                            immediately. It will appear directly in the
                            destination outlet's inbound queue for receipt.
                          </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="font-bold uppercase tracking-wider text-xs h-11 px-6 w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              isSubmitting ||
                              items.length === 0 ||
                              items.some(
                                (i) =>
                                  i.availableStock <= 0 ||
                                  i.quantity <= 0 ||
                                  i.quantity > i.availableStock,
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs h-11 px-6 shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
                          >
                            {isSubmitting ? (
                              "Sending..."
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Stock
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <DirectTransferBulkUploadModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImportComplete={handleCsvImportComplete}
      />
    </div>
  );
}


export default function DirectTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading form...
          </p>
        </div>
      }
    >
      <DirectTransferForm />
    </Suspense>
  );
}
