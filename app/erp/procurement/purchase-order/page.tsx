'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Eye, Download, Loader2, Search, X, Filter } from 'lucide-react';
import { PurchaseOrder } from '@/lib/api';
import { getPurchaseOrders, queuePurchaseOrderExport } from '@/lib/actions/purchase-order';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { toast } from 'sonner';

export default function PurchaseOrderList() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [isExportingAll, setIsExportingAll] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('erp.procurement.po.create');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getPurchaseOrders();
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const availableBrands = useMemo(() => {
        const brandsSet = new Set<string>();
        orders.forEach((o) => {
            (o.items || []).forEach((item) => {
                if (item.item?.brand?.name) {
                    brandsSet.add(item.item.brand.name.toUpperCase());
                }
            });
        });
        return Array.from(brandsSet).sort();
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Brand filter
            if (selectedBrand !== 'ALL') {
                const hasBrand = (order.items || []).some(
                    (i) => (i.item?.brand?.name || '').toUpperCase() === selectedBrand.toUpperCase(),
                );
                if (!hasBrand) return false;
            }

            // Status filter
            if (selectedStatus !== 'ALL' && order.status !== selectedStatus) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const poNum = (order.poNumber || '').toLowerCase();
                const vendor = (order.vendor?.name || '').toLowerCase();
                const notes = (order.notes || '').toLowerCase();
                const brands = (order.items || []).map((i) => i.item?.brand?.name || '').join(' ').toLowerCase();

                if (!poNum.includes(q) && !vendor.includes(q) && !notes.includes(q) && !brands.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [orders, selectedBrand, selectedStatus, searchQuery]);

    const handleExportSingle = async (poId: string, poNumber: string) => {
        try {
            setExportingId(poId);
            await queuePurchaseOrderExport({ poId });
            toast.success(`Export queued for ${poNumber}. You will receive a notification when it is ready.`);
        } catch (error: any) {
            console.error('Export error:', error);
            toast.error(error?.message || 'Failed to queue export');
        } finally {
            setExportingId(null);
        }
    };

    const handleExportAll = async () => {
        try {
            setIsExportingAll(true);
            await queuePurchaseOrderExport({
                status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
                search: searchQuery.trim() || undefined,
            });
            toast.success('Purchase Orders export queued. You will receive a notification when it is ready.');
        } catch (error: any) {
            console.error('Export error:', error);
            toast.error(error?.message || 'Failed to queue export');
        } finally {
            setIsExportingAll(false);
        }
    };

    const hasActiveFilters = selectedBrand !== 'ALL' || selectedStatus !== 'ALL' || searchQuery.trim() !== '';

    const handleResetFilters = () => {
        setSelectedBrand('ALL');
        setSelectedStatus('ALL');
        setSearchQuery('');
    };

    return (
        <PermissionGuard permissions="erp.procurement.po.read">
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
                        onClick={handleExportAll}
                        disabled={isExportingAll}
                    >
                        {isExportingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Export List
                    </Button>
                    <Link href="/erp/reports/purchase-order-register" transitionTypes={["nav-forward"]}>
                        <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400">
                            PO Register Report
                        </Button>
                    </Link>
                    {canCreate && (
                        <>
                            <Link href="/erp/procurement/purchase-order/create" transitionTypes={["nav-forward"]}>
                                <Button variant="secondary">
                                    <Plus className="mr-2 h-4 w-4" /> Create Direct PO
                                </Button>
                            </Link>
                            <Link href="/erp/procurement/purchase-order/pending" transitionTypes={["nav-forward"]}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> From Quotations
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            Recent Orders
                            <span className="text-xs font-normal text-muted-foreground">
                                ({filteredOrders.length} of {orders.length})
                            </span>
                        </CardTitle>

                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search Filter */}
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder="Search PO, Vendor, Note..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9 text-xs"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Brand Filter */}
                            <div className="w-full sm:w-44">
                                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <SelectValue placeholder="Brand: All" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs">
                                            All Brands
                                        </SelectItem>
                                        {availableBrands.map((brand) => (
                                            <SelectItem key={brand} value={brand} className="text-xs">
                                                {brand}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="w-full sm:w-44">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Status: All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                                        <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
                                        <SelectItem value="PENDING_CHECKER" className="text-xs">Pending Checker</SelectItem>
                                        <SelectItem value="PENDING_AUTHORIZER" className="text-xs">Pending Authorizer</SelectItem>
                                        <SelectItem value="OPEN" className="text-xs">Open</SelectItem>
                                        <SelectItem value="PARTIALLY_RECEIVED" className="text-xs">Partially Received</SelectItem>
                                        <SelectItem value="RECEIVED" className="text-xs">Received</SelectItem>
                                        <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
                                        <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reset Filters */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                    <X className="mr-1 h-3.5 w-3.5" /> Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO #</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Order Date</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        {hasActiveFilters
                                            ? 'No purchase orders match the selected filters.'
                                            : 'No purchase orders found.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => {
                                    const brands = [...new Set((order.items || []).map(i => i.item?.brand?.name).filter(Boolean))];
                                    const brandNames = brands.length > 0 ? brands.join(", ") : "—";
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.poNumber}</TableCell>
                                            <TableCell>{order.vendor?.name}</TableCell>
                                            <TableCell>{brandNames}</TableCell>
                                            <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="max-w-[220px]">
                                                {order.notes ? (
                                                    <span className="text-xs text-foreground line-clamp-2" title={order.notes}>
                                                        {order.notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/60 italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                Rs. {Number(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        <TableCell>
                                            {(() => {
                                                switch (order.status) {
                                                    case 'PENDING_CHECKER':
                                                        return (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                                                                Pending Checker
                                                            </Badge>
                                                        );
                                                    case 'PENDING_AUTHORIZER':
                                                        return (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">
                                                                Pending Authorizer
                                                            </Badge>
                                                        );
                                                    case 'OPEN':
                                                        return (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                                                                Open
                                                            </Badge>
                                                        );
                                                    case 'REJECTED':
                                                        return (
                                                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900">
                                                                Rejected
                                                            </Badge>
                                                        );
                                                    case 'CLOSED':
                                                        return (
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900">
                                                                Closed
                                                            </Badge>
                                                        );
                                                    case 'PARTIALLY_RECEIVED':
                                                        return (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-medium dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900">
                                                                Partially Received
                                                            </Badge>
                                                        );
                                                    case 'RECEIVED':
                                                        return (
                                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900">
                                                                Received
                                                            </Badge>
                                                        );
                                                    default:
                                                        return (
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">
                                                                {order.status}
                                                            </Badge>
                                                        );
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400"
                                                    onClick={() => handleExportSingle(order.id, order.poNumber)}
                                                    disabled={exportingId === order.id}
                                                    title="Export this PO to Excel"
                                                >
                                                    {exportingId === order.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                    <span className="sr-only md:not-sr-only md:ml-1">Export</span>
                                                </Button>
                                                <Link href={`/erp/procurement/purchase-order/${order.id}`} transitionTypes={["nav-forward"]}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="mr-1 h-4 w-4" /> View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        </PermissionGuard>
    );
}
