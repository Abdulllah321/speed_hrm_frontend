"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Send, AlertCircle, CheckCircle2, Printer, Loader2, ArrowLeft, AlertTriangle, Trash2, ScanBarcode, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { createStockRequisition } from "@/lib/actions/stock-requisition";
import { createTransferRequest } from "@/lib/actions/transfer-request";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";
import { inventoryApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RequestTransferBulkUploadModal, RequestTransferImportItem } from "@/components/pos/inventory/request-transfer-bulk-upload-modal";

interface RequestItem {
    id: string;
    sku: string;
    description: string;
    size?: string;
    color?: string;
    maxQuantity: number;
    quantity: number;
}

function RequestTransferForm() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Details from query parameters
    const itemId = searchParams?.get("itemId") || "";
    const sku = searchParams?.get("sku") || "";
    const description = searchParams?.get("description") || "";
    const size = searchParams?.get("size") || "";
    const color = searchParams?.get("color") || "";
    const maxQuantity = parseFloat(searchParams?.get("maxQuantity") || "0");
    const fromLocationId = searchParams?.get("fromLocationId") || "";
    const fromLocationName = searchParams?.get("fromLocationName") || "";
    const fromWarehouseId = searchParams?.get("fromWarehouseId") || "";
    const fromWarehouseName = searchParams?.get("fromWarehouseName") || "";

    const [items, setItems] = useState<RequestItem[]>([]);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdRequest, setCreatedRequest] = useState<any>(null);
    const [csvImportOpen, setCsvImportOpen] = useState(false);

    const handleCsvImportComplete = useCallback((importedItems: RequestTransferImportItem[]) => {
        setItems((prev) => {
            const updated = [...prev];
            importedItems.forEach((newItem) => {
                const existingIndex = updated.findIndex((i) => i.id === newItem.id);
                if (existingIndex > -1) {
                    const newQty = updated[existingIndex].quantity + newItem.quantity;
                    updated[existingIndex].quantity = Math.min(newQty, newItem.maxQuantity);
                } else {
                    updated.push({
                        id: newItem.id,
                        sku: newItem.sku,
                        description: newItem.description,
                        size: newItem.size,
                        color: newItem.color,
                        maxQuantity: newItem.maxQuantity,
                        quantity: newItem.quantity,
                    });
                }
            });
            return updated;
        });
        toast.success(`${importedItems.length} item(s) imported from CSV/Excel.`);
    }, []);

    // Search bar states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

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
                    maxQuantity: maxQuantity,
                    quantity: 1,
                }
            ]);
        }
    }, [itemId, sku, description, size, color, maxQuantity]);

    // Debounced Live Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    // Search inventory specifically at the source location
                    const res = await inventoryApi.search(
                        searchQuery.trim(),
                        fromWarehouseId || undefined,
                        fromLocationId || undefined
                    );
                    if (res.status && res.data) {
                        setSearchResults(res.data);
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
    }, [searchQuery, fromWarehouseId, fromLocationId]);

    // Reset active index when search results change
    useEffect(() => {
        setActiveIndex(-1);
    }, [searchResults, searchQuery]);

    const handleSelectProduct = (product: any) => {
        const prodSize = typeof product.size === "object" ? product.size?.name : product.size;
        const prodColor = typeof product.color === "object" ? product.color?.name : product.color;
        const prodStock = Number(product.totalQuantity || product.stockQty || 0);

        if (prodStock <= 0) {
            toast.warning(`Item ${product.sku} has no available stock at the source location.`);
        }

        setItems((prev) => {
            const existingIndex = prev.findIndex((i) => i.id === product.id);
            if (existingIndex > -1) {
                const existing = prev[existingIndex];
                if (existing.quantity + 1 > prodStock) {
                    toast.error(`Only ${prodStock} units available at source`);
                    return prev;
                }
                return prev.map((item, idx) =>
                    idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [
                ...prev,
                {
                    id: product.id,
                    sku: product.sku || "-",
                    description: product.description || "Unknown Item",
                    size: prodSize || "",
                    color: prodColor || "",
                    maxQuantity: prodStock,
                    quantity: 1,
                },
            ];
        });

        setSearchQuery("");
        setSearchResults([]);
    };

    const handleSearchSubmit = () => {
        if (searchResults.length > 0) {
            handleSelectProduct(searchResults[0]);
        } else {
            toast.error("Product not found at source location");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (searchResults.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % searchResults.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
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
                if (val > item.maxQuantity) {
                    toast.error(`Cannot request more than available stock at source (${item.maxQuantity} units)`);
                    return { ...item, quantity: item.maxQuantity };
                }
                return { ...item, quantity: val };
            })
        );
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (items.length === 0) {
            toast.error("Please add at least one item to request");
            return;
        }

        // Validate quantities
        for (const item of items) {
            if (item.quantity <= 0) {
                toast.error(`Please enter a valid quantity for item ${item.sku}`);
                return;
            }
            if (item.quantity > item.maxQuantity) {
                toast.error(`Quantity for ${item.sku} exceeds available stock at source (${item.maxQuantity} units)`);
                return;
            }
        }

        const toLocationId = user?.terminal?.location?.id || user?.locationId;
        if (!toLocationId) {
            toast.error("Your terminal/outlet location is not configured");
            return;
        }

        setIsSubmitting(true);
        try {
            const isFromOutlet = !!fromLocationId;
            let res;
            if (isFromOutlet) {
                // Direct Outlet-to-Outlet Transfer Request
                res = await createTransferRequest({
                    fromLocationId: fromLocationId,
                    toLocationId: toLocationId,
                    transferType: "OUTLET_TO_OUTLET",
                    items: items.map((item) => ({
                        itemId: item.id,
                        quantity: item.quantity,
                    })),
                    notes,
                });
            } else {
                // Stock Requisition (SRN) from Warehouse
                res = await createStockRequisition({
                    fromWarehouseId: fromWarehouseId,
                    toLocationId: toLocationId,
                    documentType: "Outlet Request",
                    status: "PENDING",
                    items: items.map((item) => ({
                        itemId: item.id,
                        quantity: item.quantity,
                    })),
                    notes,
                });
            }

            if (res.status) {
                setCreatedRequest(res.data);
                setIsSuccess(true);
                toast.success(res.message || "Request sent successfully");
            } else {
                toast.error(res.message || "Failed to send Request");
            }
        } catch (error: any) {
            console.error("Request stock error:", error);
            toast.error(error.message || "An error occurred while sending the request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintCreatedRequest = () => {
        if (!createdRequest) return;
        const refNo = createdRequest.requestNo || createdRequest.requisitionNo || "N/A";
        const isOutletToOutlet = createdRequest.transferType === "OUTLET_TO_OUTLET" || createdRequest.documentType === "OUTLET_TO_OUTLET";
        const typeTitle = isOutletToOutlet ? "OUTLET-TO-OUTLET TRANSFER REQUEST" : "STOCK REQUISITION NOTE";
        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Allow popups to print");
            return;
        }

        const dateStr = format(new Date(), "dd MMM yyyy HH:mm");
        const companyName = "Speed Limit";
        const sourceLoc = fromLocationName || fromWarehouseName || "N/A";
        const destLoc = user?.terminal?.location?.name || user?.locationId || "N/A";

        const itemsHtml = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="font-bold">${item.sku || "—"}</td>
                <td>${item.description || "Item"}</td>
                <td>${item.size || "—"}</td>
                <td>${item.color || "—"}</td>
                <td class="text-right font-bold">${item.quantity}</td>
            </tr>
        `).join("");

        win.document.write(`
            <html><head><title>Transfer Request - ${refNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.4; padding: 40px; }
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 1px; }
                .document-title { font-size: 14px; font-weight: 600; color: #4b5563; text-transform: uppercase; margin-top: 4px; }
                .status-badge { padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; border: 1px solid; display: inline-block; }
                .status-pending { background-color: #fef3c7; color: #d97706; border-color: #f59e0b; }
                
                .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                
                .notes-section { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 40px; border-radius: 0 8px 8px 0; }
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
                        <span class="status-badge status-pending">PENDING SOURCE APPROVAL</span>
                    </div>
                </div>
                
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Reference No</span>
                        <span class="meta-value">${refNo}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Request Date</span>
                        <span class="meta-value">${dateStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Source Outlet / Location</span>
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
                
                ${notes ? `
                    <div class="notes-section">
                        <div class="notes-title">Request Notes / Remarks</div>
                        <div class="notes-content">${notes}</div>
                    </div>
                ` : ''}
                
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
        router.push("/pos/inventory/view");
    };

    if (!fromWarehouseId && !fromLocationId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
                <div className="max-w-md p-6 bg-card border rounded-2xl shadow-xl space-y-4">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
                    <h3 className="text-xl font-bold text-foreground">No Source Location Selected</h3>
                    <p className="text-muted-foreground text-sm">
                        Please go to the Outlet Request page and select a sourcing location to request stock.
                    </p>
                    <Button onClick={handleClose} className="w-full">
                        Go to Outlet Request
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">Request Stock Transfer</h1>
                        <p className="text-sm text-muted-foreground">Request stock from warehouse or another outlet</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setCsvImportOpen(true)} className="gap-2 h-10">
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
                                            <h3 className="text-xl font-bold text-foreground">Request Sent!</h3>
                                            <p className="text-muted-foreground text-sm max-w-sm">
                                                Your transfer request has been submitted successfully.
                                            </p>
                                        </div>

                                        {createdRequest && (
                                            <div className="p-4 bg-muted/40 rounded-xl w-full border font-mono text-xs space-y-3 text-left">
                                                <div className="flex justify-between border-b pb-2 border-border/50">
                                                    <span className="text-muted-foreground font-semibold">Ref No:</span>
                                                    <span className="font-bold text-foreground">{createdRequest.requestNo || createdRequest.requisitionNo || "N/A"}</span>
                                                </div>
                                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                    <span className="text-muted-foreground font-semibold block mb-1">Requested Items:</span>
                                                    {items.map((item) => (
                                                        <div key={item.id} className="flex justify-between text-[11px]">
                                                            <span className="truncate max-w-[200px] text-foreground">{item.sku} - {item.description}</span>
                                                            <span className="font-bold text-foreground flex-none ml-2">{item.quantity} Units</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between border-t pt-2 border-border/50">
                                                    <span className="text-muted-foreground font-semibold">Source:</span>
                                                    <span className="font-bold text-foreground truncate max-w-[180px]">
                                                        {fromLocationName || fromWarehouseName}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground font-semibold">Type:</span>
                                                    <span className="font-bold text-foreground">
                                                        {createdRequest.transferType || createdRequest.documentType || (fromLocationId ? "OUTLET_TO_OUTLET" : "Outlet Request")}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 w-full pt-4">
                                            <Button
                                                type="button"
                                                className="w-full h-11 font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={handlePrintCreatedRequest}
                                            >
                                                <Printer className="h-4 w-4" /> Print Request Slip
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
                                            Request Entry
                                        </span>
                                        <span className="text-[9px] font-medium text-primary uppercase font-mono">
                                            Search Stock at Source
                                        </span>
                                    </div>

                                    <div className="relative flex-1">
                                        <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={`Search item to request from ${fromLocationName || fromWarehouseName}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="pl-9 bg-muted/30 border-input h-11 w-full text-sm"
                                        />

                                        {/* Autocomplete Dropdown */}
                                        {searchQuery.trim().length > 0 && (searchResults.length > 0 || isSearching) && (
                                            <div className="absolute left-0 right-0 top-13 bg-popover border border-border shadow-md rounded-md overflow-hidden z-[500] max-h-64 overflow-y-auto">
                                                {isSearching ? (
                                                    <div className="p-3 text-sm text-muted-foreground flex items-center justify-center">
                                                        Searching source inventory...
                                                    </div>
                                                ) : (
                                                    <ul className="flex flex-col">
                                                        {searchResults.map((product, idx) => (
                                                            <li
                                                                key={product.id}
                                                                className={cn(
                                                                    "px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0 transition-colors",
                                                                    idx === activeIndex && "bg-primary/10 border-l-4 border-l-primary"
                                                                )}
                                                                onClick={() => handleSelectProduct(product)}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-semibold">
                                                                        {product.description || 'Unknown Product'}
                                                                        {product.size?.name && (
                                                                            <span className="ml-2 text-[10px] font-normal text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                                                                Size: {product.size.name}
                                                                            </span>
                                                                        )}
                                                                        {product.color?.name && (
                                                                            <span className="ml-2 text-[10px] font-normal text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                                                                Color: {product.color.name}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">SKU: {product.sku || '-'}</span>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="text-xs font-bold text-blue-600">
                                                                        Stock at Source: {product.totalQuantity || 0}
                                                                    </span>
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
                                {/* Left Column: Requested Items List */}
                                <div className="md:col-span-3">
                                    <Card className="border border-border/80 shadow-lg overflow-hidden rounded-2xl bg-card">
                                        <CardHeader className="bg-muted/10 border-b border-border/50 p-6 flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg font-bold tracking-tight">Requested Items</CardTitle>
                                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                                    Review and edit quantities of items to request
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
                                                    <p className="text-sm font-medium">No items selected yet.</p>
                                                    <p className="text-xs text-muted-foreground/80">Use the search bar above to query and add items from the source location.</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-border/60">
                                                    {items.map((item) => (
                                                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-foreground text-sm tracking-tight">{item.sku}</span>
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
                                                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                                                                    Available Stock at Source: {item.maxQuantity} Units
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-28">
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        max={item.maxQuantity}
                                                                        value={item.quantity === 0 ? "" : item.quantity}
                                                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
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

                                {/* Right Column: Form Summary */}
                                <div className="md:col-span-2 space-y-6">
                                    <Card className="border border-border/80 shadow-lg overflow-hidden rounded-2xl bg-card">
                                        <CardContent className="p-6">
                                            <form onSubmit={handleSubmit} className="space-y-5">
                                                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block tracking-wider mb-0.5">Sourcing Location</span>
                                                        <span className="text-sm font-bold text-foreground block truncate">
                                                            {fromLocationName || fromWarehouseName || "N/A"}
                                                            {fromLocationName && fromWarehouseName && fromLocationName !== fromWarehouseName && (
                                                                <span className="text-[10px] font-normal text-muted-foreground block mt-0.5">
                                                                    Warehouse: {fromWarehouseName}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block tracking-wider mb-0.5">Requesting Destination</span>
                                                        <span className="text-sm font-bold text-foreground block truncate">
                                                            {user?.terminal?.location?.name || user?.locationId || "N/A"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                        Additional Notes (Optional)
                                                    </Label>
                                                    <Textarea
                                                        id="notes"
                                                        placeholder="e.g. Urgent requirement for customer order #123"
                                                        className="resize-none focus-visible:ring-ring bg-muted/30 min-h-[100px]"
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                    />
                                                </div>

                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-700 dark:text-amber-400 text-xs font-medium">
                                                    <AlertCircle className="w-5 h-5 flex-none mt-0.5 text-amber-600" />
                                                    <p className="leading-relaxed">
                                                        This request will be sent to the sourcing branch manager for approval.
                                                        Stock will be reserved upon approval and notified to your terminal.
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
                                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-11 px-6 shadow-lg shadow-blue-600/20 w-full sm:w-auto"
                                                    >
                                                        {isSubmitting ? "Sending..." : (
                                                            <>
                                                                <Send className="w-4 h-4 mr-2" />
                                                                Submit Request
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
            <RequestTransferBulkUploadModal
                open={csvImportOpen}
                onOpenChange={setCsvImportOpen}
                fromWarehouseId={fromWarehouseId || undefined}
                fromLocationId={fromLocationId || undefined}
                onImportComplete={handleCsvImportComplete}
            />
        </div>
    );
}

export default function RequestTransferPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Loading form...</p>
            </div>
        }>
            <RequestTransferForm />
        </Suspense>
    );
}
