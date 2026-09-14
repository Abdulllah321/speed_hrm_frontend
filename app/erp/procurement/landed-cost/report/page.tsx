'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getLandedCosts } from '@/lib/actions/landed-cost';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Loader2, Search, Layers, Package, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { PermissionGuard } from '@/components/auth/permission-guard';

export default function LandedCostListPage() {
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await getLandedCosts();
            setData(Array.isArray(res) ? res : res?.data || []);
        } catch (err) {
            console.error('Failed to fetch landed costs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(item =>
            item.landedCostNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.grn?.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, item) => ({
            quantity: acc.quantity + Number(item.totalQuantity || 0),
            cost: acc.cost + Number(item.totalLandedCost || 0),
        }), { quantity: 0, cost: 0 });
    }, [filteredData]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <PermissionGuard permissions="erp.procurement.landed-cost.read">
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Landed Cost Reports</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Summary of all landed cost computations and inventory capitalization</p>
                </div>
                <Button onClick={() => router.push('/erp/procurement/landed-cost/setup')}>
                    <Plus className="mr-2 h-4 w-4" /> New Landed Cost
                </Button>
            </div>

            {/* KPI Summary Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Reports</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{filteredData.length}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Computed Landed Costs</p>
                        </div>
                        <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Received Quantity</p>
                            <h3 className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{totals.quantity.toLocaleString()}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Units capitalized in stock</p>
                        </div>
                        <div className="rounded-lg p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                            <Package className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Landed Cost (PKR)</p>
                            <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">Rs. {Math.round(totals.cost).toLocaleString()}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Capitalized Purchases Value</p>
                        </div>
                        <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                            <Coins className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search by LC#, GRN, or Supplier..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-slate-800">
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300">LC Number</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300">Date</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300">GRN Reference</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300">Supplier</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right">Total Quantity</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right">Total Cost (PKR)</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                        No Landed Cost records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <TableCell className="font-semibold text-blue-700 dark:text-blue-400">{item.landedCostNumber}</TableCell>
                                        <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{item.grn?.grnNumber}</TableCell>
                                        <TableCell>{item.supplier?.name}</TableCell>
                                        <TableCell className="text-right">{Number(item.totalQuantity).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">{Math.round(Number(item.totalLandedCost || 0)).toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                                onClick={() => router.push(`/erp/procurement/landed-cost/report/${item.id}`)}
                                            >
                                                <FileText className="h-4 w-4 mr-1" /> View Report
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {filteredData.length > 0 && (
                            <TableFooter>
                                <TableRow className="bg-slate-100 dark:bg-slate-800/80 font-extrabold border-t-2 border-slate-300 dark:border-slate-700">
                                    <TableCell colSpan={4} className="font-extrabold uppercase text-slate-800 dark:text-slate-200">
                                        Grand Total ({filteredData.length} Records)
                                    </TableCell>
                                    <TableCell className="text-right font-black text-slate-900 dark:text-slate-100">
                                        {totals.quantity.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-400">
                                        Rs. {Math.round(totals.cost).toLocaleString()}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </CardContent>
            </Card>
        </div>
        </PermissionGuard>
    );
}
