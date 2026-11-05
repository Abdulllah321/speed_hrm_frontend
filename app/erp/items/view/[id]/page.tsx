import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Edit,
    Package,
    ScanBarcode,
    Layers,
    ExternalLink,
    Store,
    Tag,
} from "lucide-react";
import Link from "next/link";
import { getItemById, getArticleBySku } from "@/lib/actions/items";
import { format } from "date-fns";
import { hasPermission } from "@/lib/auth";
import { AccessDenied } from "@/components/auth/access-denied";
import { cn } from "@/lib/utils";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ViewItemPage({ params }: PageProps) {
    const { id: itemId } = await params;

    const result = await getItemById(itemId);

    if (!result || !result.status || !result.data) {
        notFound();
    }

    const item = result.data;

    // Fetch sibling variants of this article
    let articleData: any = null;
    if (item.sku) {
        const articleResult = await getArticleBySku(item.sku);
        if (articleResult?.status && articleResult?.data) {
            articleData = articleResult.data;
        }
    }

    const siblings = (articleData?.variants || []).filter((v: any) => v.id !== item.id);

    const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children}
                </div>
            </CardContent>
        </Card>
    );

    const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="text-sm font-semibold text-foreground">{value || "—"}</div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center space-x-3">
                    <Link href="/erp/items/list" transitionTypes={["nav-back"]}>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">Variant Item Details</h1>
                            <Badge variant="outline" className="font-mono text-xs">
                                {item.itemId}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Individual SKU Variant record in the ERP catalog
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {item.sku && (
                        <Link
                            href={`/erp/items/article/${encodeURIComponent(item.sku)}`}
                            transitionTypes={["nav-forward"]}
                        >
                            <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
                                <Layers className="h-4 w-4" />
                                View Full Article ({item.sku})
                            </Button>
                        </Link>
                    )}
                    <Link href={`/erp/items/edit/${itemId}`} transitionTypes={["nav-forward"]}>
                        <Button className="gap-1.5">
                            <Edit className="h-4 w-4" /> Edit Variant
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Parent Article Context Strip (Resolves confusion!) */}
            <Card className="border-primary/20 bg-primary/5 shadow-xs">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Parent Article Style:</span>
                                <span className="font-mono font-bold text-foreground text-sm">{item.sku}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description || articleData?.description || "Style article"}
                            </p>
                        </div>
                    </div>

                    {/* Sibling Size Switcher */}
                    {articleData?.variants && articleData.variants.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground mr-1">Switch Size:</span>
                            {articleData.variants.map((v: any) => {
                                const isCurrent = v.id === item.id;
                                return (
                                    <Link
                                        key={v.id}
                                        href={`/erp/items/view/${v.id}`}
                                        transitionTypes={["nav-forward"]}
                                    >
                                        <Badge
                                            variant={isCurrent ? "default" : "outline"}
                                            className={cn(
                                                "cursor-pointer text-xs transition-all",
                                                isCurrent
                                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                    : "hover:bg-muted font-normal text-muted-foreground"
                                            )}
                                        >
                                            {v.size?.name || v.itemId}
                                        </Badge>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Variant Hero Header Card */}
            <Card className="border-border/60 shadow-xs overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-muted rounded-xl shrink-0 text-foreground">
                            <ScanBarcode className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={item.isActive ? "default" : "secondary"}>
                                    {item.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {item.size?.name && (
                                    <Badge variant="outline" className="font-semibold text-xs">
                                        Size: {item.size.name}
                                    </Badge>
                                )}
                                {item.color?.name && (
                                    <Badge variant="outline" className="font-medium text-xs">
                                        Color: {item.color.name}
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                                Barcode: {item.barCode || "Not Assigned"}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Internal Item ID: <strong className="font-mono text-foreground">{item.itemId}</strong>
                                {item.uniqueNo && (
                                    <> · Unique No: <strong className="font-mono text-blue-600 dark:text-blue-400">{item.uniqueNo}</strong></>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-center bg-muted/30 p-4 rounded-xl border border-border/60">
                        <span className="text-xs font-medium text-muted-foreground">Retail Unit Price</span>
                        <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                            {Number(item.unitPrice).toLocaleString("en-US", {
                                style: "currency",
                                currency: "PKR",
                                minimumFractionDigits: 2,
                            })}
                        </div>
                        {item.discountRate ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {item.discountRate}% Active Discount
                            </span>
                        ) : null}
                    </div>
                </div>

                {item.imageUrl && (
                    <div className="p-6 border-t flex justify-center bg-muted/10">
                        <img
                            src={item.imageUrl}
                            alt={item.itemId}
                            className="max-w-xs w-full h-auto rounded-lg border shadow-xs object-contain"
                        />
                    </div>
                )}
            </Card>

            <InfoSection title="Basic Details">
                <InfoItem label="Description" value={item.description} />
                <InfoItem label="Style / SKU" value={item.sku} />
                <InfoItem label="Barcode" value={item.barCode} />
                <InfoItem label="Brand" value={item.brand?.name} />
                <InfoItem label="Segment" value={item.segment?.name} />
                <InfoItem label="HS Code" value={item.hsCode?.hsCode || item.hsCodeStr} />
            </InfoSection>

            <InfoSection title="Classification">
                <InfoItem label="Division" value={item.division?.name} />
                <InfoItem label="Category" value={item.category?.name} />
                <InfoItem label="Sub Category" value={item.subCategory?.name} />
                <InfoItem label="Item Class" value={item.itemClass?.name} />
                <InfoItem label="Item Subclass" value={item.itemSubclass?.name} />
                <InfoItem label="Channel Class" value={item.channelClass?.name} />
                <InfoItem label="Gender" value={item.gender?.name} />
                <InfoItem label="Season" value={item.season?.name} />
            </InfoSection>

            <InfoSection title="Pricing & Discounts">
                <InfoItem
                    label="Unit Price"
                    value={Number(item.unitPrice).toLocaleString("en-US", {
                        style: "currency",
                        currency: "PKR",
                        minimumFractionDigits: 2,
                    })}
                />
                <InfoItem label="Tax Rate 1" value={item.taxRate1 ? `${item.taxRate1}%` : null} />
                <InfoItem label="Tax Rate 2" value={item.taxRate2 ? `${item.taxRate2}%` : null} />
                <InfoItem label="Discount Rate" value={item.discountRate ? `${item.discountRate}%` : null} />
                <InfoItem
                    label="Discount Amount"
                    value={item.discountAmount ? Number(item.discountAmount).toLocaleString("en-US", { style: "currency", currency: "PKR" }) : null}
                />
                <InfoItem
                    label="Discount Start Date"
                    value={item.discountStartDate ? format(new Date(item.discountStartDate), "PPP") : null}
                />
                <InfoItem
                    label="Discount End Date"
                    value={item.discountEndDate ? format(new Date(item.discountEndDate), "PPP") : null}
                />
            </InfoSection>

            <InfoSection title="Attributes">
                <InfoItem label="Size" value={item.size?.name} />
                <InfoItem label="Color" value={item.color?.name} />
                <InfoItem label="Silhouette" value={item.silhouette?.name} />
                <InfoItem label="Case" value={item.case} />
                <InfoItem label="Band" value={item.band} />
                <InfoItem label="Movement Type" value={item.movementType} />
                <InfoItem label="Unique No." value={item.uniqueNo} />
                <InfoItem label="Heel Height" value={item.heelHeight} />
                <InfoItem label="Width" value={item.width} />
            </InfoSection>

            {/* Sibling Variants Table */}
            {siblings.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-base font-bold">
                                Other Variants of Article &quot;{item.sku}&quot; ({siblings.length})
                            </CardTitle>
                            <CardDescription>
                                Sibling sizes and colors belonging to this same style
                            </CardDescription>
                        </div>
                        <Link
                            href={`/erp/items/article/${encodeURIComponent(item.sku)}`}
                            transitionTypes={["nav-forward"]}
                        >
                            <Button variant="ghost" size="sm" className="gap-1 text-xs">
                                View Full Article Matrix <ExternalLink className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="border-t overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-left">
                                        <th className="py-2.5 px-3">Item ID</th>
                                        <th className="py-2.5 px-3">Barcode</th>
                                        <th className="py-2.5 px-3">Size</th>
                                        <th className="py-2.5 px-3">Color</th>
                                        <th className="py-2.5 px-3 text-right">Price</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {siblings.map((sib: any) => (
                                        <tr key={sib.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 px-3 font-mono font-medium">{sib.itemId}</td>
                                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{sib.barCode || "—"}</td>
                                            <td className="py-2.5 px-3">
                                                {sib.size?.name ? (
                                                    <Badge variant="outline" className="text-xs py-0">
                                                        {sib.size.name}
                                                    </Badge>
                                                ) : "—"}
                                            </td>
                                            <td className="py-2.5 px-3">{sib.color?.name || "—"}</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                                                {Number(sib.unitPrice).toLocaleString("en-US", {
                                                    style: "currency",
                                                    currency: "PKR",
                                                    minimumFractionDigits: 0,
                                                })}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Badge variant={sib.isActive ? "default" : "secondary"} className="text-[10px] py-0">
                                                    {sib.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <Link
                                                    href={`/erp/items/view/${sib.id}`}
                                                    transitionTypes={["nav-forward"]}
                                                >
                                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                                        View
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
