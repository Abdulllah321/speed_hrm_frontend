"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface TransferItem {
  id: string;
  sku: string;
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

  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState("");
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

  // Search bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const fromLocationId = user?.terminal?.location?.id || user?.locationId;

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
        // Filter out current location and keep active locations
        const filtered = res.data.filter(
          (loc) => loc.id !== fromLocationId && loc.status === "active",
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

  // Debounced Live Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await authFetch(`/pos-sales/lookup`, {
            params: { q: searchQuery.trim() },
          });
          if (res.ok && res.data?.status && res.data.data) {
            setSearchResults(res.data.data);
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
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset active index when search results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults, searchQuery]);

  const handleSelectProduct = (product: any) => {
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
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await authFetch(`/pos-sales/scan`, {
        params: { barcode: searchQuery.trim() },
      });
      if (res.ok && res.data?.status && res.data.data) {
        handleSelectProduct(res.data.data);
      } else {
        toast.error(res.data?.message || "Item not found");
      }
    } catch {
      toast.error("Failed to scan item. Check connection.");
    }
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

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
      if (item.quantity > item.availableStock) {
        toast.error(
          `Quantity for ${item.sku} exceeds available stock (${item.availableStock} units)`,
        );
        return;
      }
    }

    setIsSubmitting(true);
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
      });

      if (res.status) {
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
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow popups to print");
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
        <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
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
          <div className="flex gap-2">
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
        <div className="max-w-5xl mx-auto w-full">
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
                              <span className="truncate max-w-[200px] text-foreground">
                                {item.sku} - {item.description}
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
                      placeholder="Scan Barcode / Search Product by Name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-9 bg-muted/30 border-input h-11 w-full text-sm"
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
                                    <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                                      SKU:{" "}
                                      <strong className="font-bold text-foreground">
                                        {product.sku || product.barCode || "-"}
                                      </strong>
                                    </span>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left Column: Items List */}
                <div className="md:col-span-3">
                  <Card className="border border-border/80 shadow-lg overflow-hidden rounded-2xl bg-card">
                    <CardHeader className="bg-muted/10 border-b border-border/50 p-6 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold tracking-tight">
                          Transfer Items
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Review and edit quantities of items to transfer
                        </CardDescription>
                      </div>
                      <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                        {items.length} Product(s)
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {items.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground/60 space-y-3">
                          <Package className="w-12 h-12 mx-auto text-muted/30" />
                          <p className="text-sm font-medium">
                            No products selected yet.
                          </p>
                          <p className="text-xs text-muted-foreground/80">
                            Use the search bar above to add products for direct
                            transfer.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground text-sm tracking-tight">
                                    {item.sku}
                                  </span>
                                  {item.size && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-300/20">
                                      Size: {item.size}
                                    </span>
                                  )}
                                  {item.color && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 ring-1 ring-inset ring-pink-700/10 dark:ring-pink-300/20">
                                      Color: {item.color}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate leading-relaxed">
                                  {item.description}
                                </p>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                                  Available Stock: {item.availableStock} Units
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-28">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={item.availableStock}
                                    value={
                                      item.quantity === 0 ? "" : item.quantity
                                    }
                                    onChange={(e) =>
                                      handleQtyChange(item.id, e.target.value)
                                    }
                                    className="h-9 text-right font-mono focus-visible:ring-ring bg-muted/20"
                                    required
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex-none"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="md:col-span-2">
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
                            <Select
                              value={selectedDestId}
                              onValueChange={setSelectedDestId}
                            >
                              <SelectTrigger className="h-11 bg-muted/30">
                                <SelectValue placeholder="Choose target outlet..." />
                              </SelectTrigger>
                              <SelectContent>
                                {destinations.map((dest) => (
                                  <SelectItem key={dest.id} value={dest.id}>
                                    {dest.name} ({dest.code})
                                  </SelectItem>
                                ))}
                                {destinations.length === 0 && (
                                  <SelectItem value="none" disabled>
                                    No other active outlets found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
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
                            disabled={isSubmitting || items.length === 0}
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
