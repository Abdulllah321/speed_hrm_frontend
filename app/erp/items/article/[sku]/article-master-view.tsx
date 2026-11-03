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
            {article.locationStock && article.locationStock.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base font-semibold">Store Stock Distribution</CardTitle>
                        </div>
                        <CardDescription>Real-time inventory levels by store outlet and central warehouse</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {article.locationStock.map((loc: any, idx: number) => (
                                <div
                                    key={`${loc.locationId}-${idx}`}
                                    className="p-3 rounded-lg border bg-muted/20 space-y-1"
                                >
                                    <div className="text-xs font-semibold text-muted-foreground truncate">
                                        {loc.locationName}
                                    </div>
                                    <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                        {loc.quantity.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">units</span>
                                    </div>
                                </div>
                            ))}
                        </div>
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

