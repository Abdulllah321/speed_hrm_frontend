"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Package,
    ScanBarcode,
    Copy,
    Check,
    ExternalLink,
    Edit,
    Eye,
    Layers,
    Search,
    Store,
    Boxes,
    Tag,
    DollarSign,
    Loader2,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getArticleBySku } from "@/lib/actions/items";
import { cn } from "@/lib/utils";

interface ArticleDetailSheetProps {
    sku: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPrintBarcodes?: (variants: any[]) => void;
}

export function ArticleDetailSheet({
    sku,
    open,
    onOpenChange,
    onPrintBarcodes,
}: ArticleDetailSheetProps) {
    const [variantSearch, setVariantSearch] = useState("");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const { data: result, isLoading, isError } = useQuery({
        queryKey: ["article-detail", sku],
        queryFn: () => (sku ? getArticleBySku(sku) : Promise.resolve(null)),
        enabled: !!sku && open,
        staleTime: 60_000,
    });

    const article = result?.data;

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(`Copied "${text}" to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Filter variants based on search
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

    const formatPrice = (val?: number) => {
        if (val === undefined || val === null || isNaN(val)) return "—";
        return Number(val).toLocaleString("en-US", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col z-[100]"
            >
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground">
                            Loading article details for <span className="font-mono font-bold text-foreground">{sku}</span>...
                        </p>
                    </div>
                ) : isError || !article ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-center">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                        <h3 className="font-semibold text-lg">Article Not Found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Could not load details for SKU &quot;{sku}&quot;. Please verify the SKU or your permissions.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Header Banner */}
                        <div className="p-6 border-b bg-gradient-to-r from-muted/40 via-muted/20 to-background shrink-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary bg-primary/5">
                                            Article / Style
                                        </Badge>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(article.sku, "sku")}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-mono text-sm font-bold transition-colors"
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
                                    <h2 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                                        {article.description || "No description provided"}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {onPrintBarcodes && article.variants?.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onPrintBarcodes(article.variants)}
                                            className="h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                                        >
                                            <ScanBarcode className="h-4 w-4" />
                                            Print All Barcodes
                                        </Button>
                                    )}
                                    <Link
                                        href={`/erp/items/article/${encodeURIComponent(article.sku)}`}
                                        transitionTypes={["nav-forward"]}
                                    >
                                        <Button size="sm" className="h-9 gap-1.5">
                                            <ExternalLink className="h-4 w-4" />
                                            Full Article Page
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Tags & Classification */}
                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                                {article.brand?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Brand: <strong className="text-foreground">{article.brand.name}</strong>
                                    </span>
                                )}
                                {article.category?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Category: <strong className="text-foreground">{article.category.name}</strong>
                                    </span>
                                )}
                                {article.division?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Division: <strong className="text-foreground">{article.division.name}</strong>
                                    </span>
                                )}
                                {article.gender?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Gender: <strong className="text-foreground">{article.gender.name}</strong>
                                    </span>
                                )}
                                {article.silhouette?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Silhouette: <strong className="text-foreground">{article.silhouette.name}</strong>
                                    </span>
                                )}
                                {article.season?.name && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        Season: <strong className="text-foreground">{article.season.name}</strong>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

                        {/* Executive KPI Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b bg-card shrink-0">
                            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium">Variants</span>
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-foreground">
                                        {article.totalVariants}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        {article.activeVariants} active · {article.totalVariants - article.activeVariants} inactive
                                    </span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium">Stock on Hand</span>
                                    <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                        {article.totalStock.toLocaleString()}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        Across all outlets & warehouse
                                    </span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium">Price Range</span>
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-base font-bold font-mono text-foreground truncate">
                                        {article.priceMin === article.priceMax
                                            ? formatPrice(article.priceMin)
                                            : `${formatPrice(article.priceMin)} – ${formatPrice(article.priceMax)}`}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">Retail unit price</span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-medium">Size Matrix</span>
                                    <Tag className="h-4 w-4" />
                                </div>
                                <div className="mt-2">
                                    <div className="text-2xl font-bold font-mono text-foreground">
                                        {article.sizes?.length || 0}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground truncate block">
                                        {article.sizes?.join(", ") || "No sizes"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Location Stock Breakdown (aggregated by store) */}
                        {article.locationStock && article.locationStock.length > 0 && (() => {
                            // Aggregate stock by locationId
                            const map = new Map<string, {
                                id: string;
                                locationName: string;
                                locationCode?: string;
                                quantity: number;
                                sizeBreakdown: Array<{ size: string; quantity: number }>;
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
                                            const es = existing.sizeBreakdown.find((s) => s.size === sb.size);
                                            if (es) es.quantity += Number(sb.quantity || 0);
                                            else existing.sizeBreakdown.push({ ...sb, quantity: Number(sb.quantity || 0) });
                                        }
                                    }
                                } else {
                                    map.set(key, {
                                        id: key,
                                        locationName: loc.locationName || "Unknown Location",
                                        locationCode: loc.locationCode,
                                        quantity: qty,
                                        sizeBreakdown: loc.sizeBreakdown ? [...loc.sizeBreakdown] : [],
                                    });
                                }
                            }

                            const stores = Array.from(map.values())
                                .filter((l) => l.quantity > 0)
                                .sort((a, b) => b.quantity - a.quantity);
                            const totalStock = stores.reduce((sum, s) => sum + s.quantity, 0);

                            if (stores.length === 0) return null;

                            return (
                                <div className="px-6 py-4 border-b bg-muted/10 shrink-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                Store Stock Distribution
                                            </span>
                                            <Badge variant="outline" className="text-[10px] font-mono py-0">
                                                {stores.length} {stores.length === 1 ? "outlet" : "outlets"}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            Total: <strong className="text-emerald-600 dark:text-emerald-400">{totalStock.toLocaleString()}</strong> units
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {stores.map((loc) => {
                                            const pct = totalStock > 0 ? Math.round((loc.quantity / totalStock) * 100) : 0;
                                            return (
                                                <div
                                                    key={loc.id}
                                                    className="p-3 rounded-lg border bg-background flex flex-col justify-between space-y-2 hover:border-primary/30 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-1.5">
                                                        <span className="text-xs font-semibold text-foreground line-clamp-1">
                                                            {loc.locationName}
                                                        </span>
                                                        <span className="text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                            {loc.quantity.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">units</span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                                        <div
                                                            className="bg-emerald-500 h-full rounded-full"
                                                            style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                                        />
                                                    </div>
                                                    {loc.sizeBreakdown.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                                                            {loc.sizeBreakdown.slice(0, 6).map((sb) => (
                                                                <span
                                                                    key={`${loc.id}-${sb.size}`}
                                                                    className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded bg-muted font-mono"
                                                                >
                                                                    <span className="text-muted-foreground">{sb.size}:</span>
                                                                    <strong className="text-emerald-600 dark:text-emerald-400">{sb.quantity}</strong>
                                                                </span>
                                                            ))}
                                                            {loc.sizeBreakdown.length > 6 && (
                                                                <span className="text-[10px] text-muted-foreground self-center">
                                                                    +{loc.sizeBreakdown.length - 6} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Variants Matrix Table Toolbar */}
                        <div className="px-6 py-3.5 border-b bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">
                                    All Variants ({filteredVariants.length})
                                </h3>
                                {variantSearch && (
                                    <span className="text-xs text-muted-foreground">
                                        filtered from {article.variants?.length}
                                    </span>
                                )}
                            </div>

                            <div className="relative max-w-xs w-full sm:w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Filter by barcode, size, color…"
                                    value={variantSearch}
                                    onChange={(e) => setVariantSearch(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-background"
                                />
                            </div>
                        </div>

                        {/* Variants Table Body */}
                        <div className="p-6">
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-muted-foreground font-medium text-left">
                                                <th className="py-2.5 px-3 w-10">#</th>
                                                <th className="py-2.5 px-3">Barcode</th>
                                                <th className="py-2.5 px-3">Size</th>
                                                <th className="py-2.5 px-3">Color</th>
                                                <th className="py-2.5 px-3 text-right">Stock</th>
                                                <th className="py-2.5 px-3 text-right">Price</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {filteredVariants.map((v: any, index: number) => {
                                                const isCopied = copiedKey === `bc-${v.id}`;
                                                return (
                                                    <tr
                                                        key={v.id}
                                                        className="hover:bg-muted/40 transition-colors group"
                                                    >
                                                        <td className="py-2.5 px-3 text-muted-foreground font-mono">
                                                            {index + 1}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(v.barCode || v.itemId, `bc-${v.id}`)}
                                                                    className="inline-flex items-center gap-1 font-mono font-medium text-foreground hover:text-primary transition-colors bg-muted/60 hover:bg-muted px-2 py-0.5 rounded"
                                                                    title="Click to copy barcode"
                                                                >
                                                                    <ScanBarcode className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span>{v.barCode || v.itemId}</span>
                                                                    {isCopied ? (
                                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                                    ) : (
                                                                        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    )}
                                                                </button>
                                                                {v.uniqueNo && (
                                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                                                        UN: {v.uniqueNo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {v.size?.name ? (
                                                                <Badge variant="outline" className="font-semibold text-xs py-0">
                                                                    {v.size.name}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {v.color?.name ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                                                    {v.color.name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                                            <span className={cn(
                                                                v.stockQuantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                            )}>
                                                                {(v.stockQuantity ?? 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                                            {formatPrice(v.unitPrice)}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <Badge
                                                                variant={v.isActive ? "default" : "secondary"}
                                                                className="text-[10px] py-0 px-1.5"
                                                            >
                                                                {v.isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Link
                                                                    href={`/erp/items/view/${v.id}`}
                                                                    transitionTypes={["nav-forward"]}
                                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                    title="View Variant Details"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Link>
                                                                <Link
                                                                    href={`/erp/items/edit/${v.id}`}
                                                                    transitionTypes={["nav-forward"]}
                                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                                    title="Edit Variant"
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

