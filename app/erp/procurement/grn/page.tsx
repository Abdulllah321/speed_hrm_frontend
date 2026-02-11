'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { grnApi, Grn } from '@/lib/api';
import { Plus, Eye, Receipt } from 'lucide-react';

export default function GrnListPage() {
    const [grns, setGrns] = useState<Grn[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGrns();
    }, []);

    const loadGrns = async () => {
        try {
            const data = await grnApi.getAll();
            setGrns(data);
        } catch (error) {
            console.error('Failed to load GRNs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Goods Receipt Notes</h1>
                    <p className="text-muted-foreground">Manage and track received goods and stock entry.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent GRNs</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10">Loading GRNs...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>GRN Number</TableHead>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Received Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {grns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No GRNs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    grns.map((grn) => (
                                        <TableRow key={grn.id}>
                                            <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                                            <TableCell className="font-mono text-sm">{grn.purchaseOrder?.poNumber || 'N/A'}</TableCell>
                                            <TableCell>{grn.warehouse?.name}</TableCell>
                                            <TableCell>{new Date(grn.receivedDate).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={grn.status === 'SUBMITTED' ? 'default' : 'secondary'}>
                                                    {grn.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/erp/procurement/grn/${grn.id}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
