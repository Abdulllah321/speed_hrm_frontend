"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Package,
    ScanBarcode,
    Copy,
    Check,
    Edit,
    Eye,
    Layers,
    Search,
    Store,
    Boxes,
    Tag,
    DollarSign,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BarcodePrintModal } from "@/components/items/barcode-print-modal";
import { cn } from "@/lib/utils";

interface ArticleMasterViewProps {
    article: any;
}

export function ArticleMasterView({ article }: ArticleMasterViewProps) {
    const [variantSearch, setVariantSearch] = useState("");
    const [stockViewMode, setStockViewMode] = useState<"cards" | "matrix">("cards");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(`Copied "${text}" to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const formatPrice = (val?: number) => {
        if (val === undefined || val === null || isNaN(val)) return "—";
        return Number(val).toLocaleString("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    const filteredVariants = useMemo(() => {
        if (!article?.variants) return [];
        if (!variantSearch.trim()) return article.variants;
        const q = variantSearch.toLowerCase().trim();
        return article.variants.filter((v: any) =>
            v.barCode?.toLowerCase().includes(q) ||
            v.size?.name?.toLowerCase().includes(q) ||
            v.color?.name?.toLowerCase().includes(q) ||
            v.uniqueNo?.toLowerCase().includes(q) ||
            v.itemId?.toLowerCase().includes(q)
        );
    }, [article?.variants, variantSearch]);

    // Process & Aggregate Store Stock Distribution
    const processedLocations = useMemo(() => {
        if (!article?.locationStock?.length) return [];

        const map = new Map<string, {
            locationId: string;
            locationName: string;
            locationCode?: string;
            quantity: number;
            percentage: number;
            sizeBreakdown: Array<{ size: string; color?: string; barcode?: string; quantity: number }>;
        }>();

        for (const loc of article.locationStock) {
            // Aggregate by name so multiple locationIds for the same store merge correctly
            const key = (loc.locationName || loc.locationId || "Unknown").trim();
            const existing = map.get(key);
            const qty = Number(loc.quantity || 0);

            if (existing) {
                existing.quantity += qty;
                if (loc.sizeBreakdown) {
                    for (const sb of loc.sizeBreakdown) {
                        const existingSize = existing.sizeBreakdown.find((s) => s.size === sb.size);
                        if (existingSize) {
                            existingSize.quantity += Number(sb.quantity || 0);
                        } else {
                            existing.sizeBreakdown.push({ ...sb, quantity: Number(sb.quantity || 0) });
                        }
                    }
                }
            } else {
                map.set(key, {
                    locationId: key,
                    locationName: loc.locationName || "Unknown Outlet",
                    locationCode: loc.locationCode || (loc.locationName ? loc.locationName.split("-")[0] : "LOC"),
                    quantity: qty,
                    percentage: loc.percentage || 0,
                    sizeBreakdown: loc.sizeBreakdown ? [...loc.sizeBreakdown] : [],
                });
            }
        }

        const list = Array.from(map.values()).filter((l) => l.quantity > 0);
        const total = list.reduce((sum, l) => sum + l.quantity, 0);

        return list
            .map((l) => ({
                ...l,
                percentage: total > 0 ? Math.round((l.quantity / total) * 100) : 0,
                sizeBreakdown: (l.sizeBreakdown || []).sort((a, b) =>
                    a.size.localeCompare(b.size, undefined, { numeric: true })
                ),
            }))
            .sort((a, b) => b.quantity - a.quantity);
    }, [article?.locationStock]);

    // Distinct sizes for the Matrix View
    const matrixSizes = useMemo(() => {
        if (article?.sizes?.length) {
            return [...article.sizes].sort((a: string, b: string) =>
                a.localeCompare(b, undefined, { numeric: true })
            );
        }
        const sizeSet = new Set<string>();
        processedLocations.forEach((loc) => {
            loc.sizeBreakdown.forEach((s) => sizeSet.add(s.size));
        });
        return Array.from(sizeSet).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );
    }, [article?.sizes, processedLocations]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
            {/* Top Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center space-x-3">
                    <Link href="/erp/items/list" transitionTypes={["nav-back"]}>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">Article Details</h1>
                            <Badge variant="outline" className="font-mono text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                                {article.sku}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Comprehensive Style Overview & Variant Matrix
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                    >
                        <ScanBarcode className="h-4 w-4" />
                        Print All Barcodes
                    </Button>
                    <Link href="/erp/items/list" transitionTypes={["nav-back"]}>
                        <Button variant="secondary">
                            Back to Items
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Article Hero Banner */}
            <Card className="border-border/60 shadow-xs overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-muted/50 via-muted/20 to-background flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                            <Package className="h-8 w-8" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Style Code:</span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(article.sku, "sku")}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-mono text-sm font-bold transition-colors"
                                    title="Click to copy SKU"
                                >
                                    {article.sku}
                                    {copiedKey === "sku" ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">
                                {article.description || "No description provided"}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                {article.brand?.name && (
                                    <Badge variant="secondary" className="font-semibold">
                                        Brand: {article.brand.name}
                                    </Badge>
                                )}
                                {article.category?.name && (
                                    <Badge variant="secondary" className="font-semibold">
                                        Category: {article.category.name}
                                    </Badge>
                                )}
                                {article.division?.name && (
                                    <Badge variant="secondary" className="font-semibold">
                                        Division: {article.division.name}
                                    </Badge>
                                )}
                                {article.gender?.name && (
                                    <Badge variant="outline" className="font-medium">
                                        Gender: {article.gender.name}
                                    </Badge>
                                )}
                                {article.silhouette?.name && (
                                    <Badge variant="outline" className="font-medium">
                                        Silhouette: {article.silhouette.name}
                                    </Badge>
                                )}
                                {article.season?.name && (
                                    <Badge variant="outline" className="font-medium">
                                        Season: {article.season.name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {article.imageUrl && (
                        <div className="shrink-0">
                            <img
                                src={article.imageUrl}
                                alt={article.sku}
                                className="h-24 w-24 object-cover rounded-lg border shadow-xs"
                            />
                        </div>
                    )}
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t divide-y md:divide-y-0 md:divide-x bg-card">
                    <div className="p-5">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Total Variants</span>
                            <Layers className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {article.totalVariants}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {article.activeVariants} active · {article.totalVariants - article.activeVariants} inactive
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Total Stock on Hand</span>
                            <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {article.totalStock.toLocaleString()}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Units across all stores
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Price Range</span>
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="text-xl font-bold font-mono text-foreground truncate">
                            {article.priceMin === article.priceMax
                                ? formatPrice(article.priceMin)
                                : `${formatPrice(article.priceMin)} – ${formatPrice(article.priceMax)}`}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Retail selling price
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-medium">Available Sizes</span>
                            <Tag className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {article.sizes?.length || 0}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block">
                            {article.sizes?.join(", ") || "—"}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Store Stock Distribution */}
            {processedLocations.length > 0 && (
                <Card className="border-border/60 shadow-xs overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <Store className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">
                                        Store Stock Distribution
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs font-mono font-medium ml-1">
                                        {processedLocations.length} {processedLocations.length === 1 ? "Outlet" : "Outlets"}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Real-time inventory levels, share distribution & size breakdown by store outlet
                                </CardDescription>
                            </div>

                            {/* View Switcher: Outlet Cards vs Size Matrix */}
                            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setStockViewMode("cards")}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                        stockViewMode === "cards"
                                            ? "bg-background text-foreground shadow-xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Boxes className="h-3.5 w-3.5" />
                                    Outlet Cards
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStockViewMode("matrix")}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                        stockViewMode === "matrix"
                                            ? "bg-background text-foreground shadow-xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Tag className="h-3.5 w-3.5" />
                                    Store × Size Matrix
                                </button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {stockViewMode === "cards" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {processedLocations.map((loc) => (
                                    <div
                                        key={loc.locationId}
                                        className="p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                                    >
                                        {/* Store Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-foreground line-clamp-1">
                                                        {loc.locationName}
                                                    </span>
                                                </div>
                                                {loc.locationCode && loc.locationCode !== loc.locationName && (
                                                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 text-muted-foreground">
                                                        {loc.locationCode}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs shrink-0 font-medium"
                                            >
                                                In Stock
                                            </Badge>
                                        </div>

                                        {/* Units and Share */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-baseline justify-between">
                                                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                    {loc.quantity.toLocaleString()}
                                                    <span className="text-xs font-normal text-muted-foreground ml-1.5">units</span>
                                                </div>
                                                <span className="text-xs font-mono font-semibold text-muted-foreground">
                                                    {loc.percentage}% of stock
                                                </span>
                                            </div>
                                            {/* Visual Progress Bar */}
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(100, Math.max(5, loc.percentage))}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Mini Size Breakdown Pills */}
                                        {loc.sizeBreakdown.length > 0 && (
                                            <div className="pt-2 border-t border-border/50">
                                                <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                                                    Sizes available at this outlet:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                    {loc.sizeBreakdown.map((sb) => (
                                                        <div
                                                            key={`${loc.locationId}-${sb.size}`}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border text-[11px] font-mono"
                                                        >
                                                            <span className="font-semibold text-foreground">{sb.size}:</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sb.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Store x Size Matrix Table */
                            <div className="rounded-lg border overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-left">
                                            <th className="py-3 px-4 font-bold text-foreground">Outlet / Store</th>
                                            {matrixSizes.map((sz) => (
                                                <th key={sz} className="py-3 px-3 text-center min-w-[50px]">
                                                    <Badge variant="outline" className="font-mono text-xs py-0">
                                                        {sz}
                                                    </Badge>
                                                </th>
                                            ))}
                                            <th className="py-3 px-4 text-right font-bold text-foreground">Total Units</th>
                                            <th className="py-3 px-4 text-right">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {processedLocations.map((loc) => {
                                            const sizeQtyMap = new Map(loc.sizeBreakdown.map((s) => [s.size, s.quantity]));
                                            return (
                                                <tr key={loc.locationId} className="hover:bg-muted/40 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <span>{loc.locationName}</span>
                                                        </div>
                                                    </td>
                                                    {matrixSizes.map((sz) => {
                                                        const qty = sizeQtyMap.get(sz) ?? 0;
                                                        return (
                                                            <td key={sz} className="py-3 px-3 text-center font-mono">
                                                                {qty > 0 ? (
                                                                    <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                                                                        {qty}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground/40">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                        {loc.quantity.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                        {loc.percentage}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 bg-muted/30 font-bold">
                                            <td className="py-3 px-4 text-foreground font-bold">
                                                Total Across All Stores
                                            </td>
                                            {matrixSizes.map((sz) => {
                                                const totalForSize = processedLocations.reduce((sum, loc) => {
                                                    const sb = loc.sizeBreakdown.find((s) => s.size === sz);
                                                    return sum + (sb?.quantity || 0);
                                                }, 0);
                                                return (
                                                    <td key={sz} className="py-3 px-3 text-center font-mono font-bold text-foreground">
                                                        {totalForSize > 0 ? totalForSize : "—"}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-3 px-4 text-right font-mono font-extrabold text-foreground text-sm">
                                                {processedLocations.reduce((s, l) => s + l.quantity, 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-foreground">
                                                100%
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Variants Matrix Table */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-3">
                    <div>
                        <CardTitle className="text-lg font-bold">Variants Matrix ({filteredVariants.length})</CardTitle>
                        <CardDescription>
                            All size and color SKUs belonging to article {article.sku}
                        </CardDescription>
                    </div>

                    <div className="relative max-w-xs w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Filter by barcode, size, color…"
                            value={variantSearch}
                            onChange={(e) => setVariantSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-left">
                                    <th className="py-3 px-4 w-12">#</th>
                                    <th className="py-3 px-4">Barcode / Unique No</th>
                                    <th className="py-3 px-4">Size</th>
                                    <th className="py-3 px-4">Color</th>
                                    <th className="py-3 px-4 text-right">Stock</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredVariants.map((v: any, index: number) => {
                                    const isCopied = copiedKey === `bc-${v.id}`;
                                    return (
                                        <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                                                {index + 1}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(v.barCode || v.itemId, `bc-${v.id}`)}
                                                            className="inline-flex items-center gap-1.5 font-mono font-medium text-foreground hover:text-primary transition-colors bg-muted px-2 py-0.5 rounded text-xs"
                                                            title="Click to copy barcode"
                                                        >
                                                            <ScanBarcode className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>{v.barCode || v.itemId}</span>
                                                            {isCopied ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    {v.uniqueNo && (
                                                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                                            Unique No: {v.uniqueNo}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {v.size?.name ? (
                                                    <Badge variant="outline" className="font-semibold text-xs">
                                                        {v.size.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {v.color?.name ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-medium">
                                                        {v.color.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-xs">
                                                <span className={cn(
                                                    v.stockQuantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                )}>
                                                    {(v.stockQuantity ?? 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-xs">
                                                {formatPrice(v.unitPrice)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={v.isActive ? "default" : "secondary"}
                                                    className="text-xs"
                                                >
                                                    {v.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/erp/items/view/${v.id}`}
                                                        transitionTypes={["nav-forward"]}
                                                    >
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                                                            <Eye className="h-3.5 w-3.5" /> View
                                                        </Button>
                                                    </Link>
                                                    <Link
                                                        href={`/erp/items/edit/${v.id}`}
                                                        transitionTypes={["nav-forward"]}
                                                    >
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                                                            <Edit className="h-3.5 w-3.5" /> Edit
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <BarcodePrintModal
                open={isPrintModalOpen}
                onOpenChange={setIsPrintModalOpen}
                items={article.variants || []}
            />
        </div>
    );
}

