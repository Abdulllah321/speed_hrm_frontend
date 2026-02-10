
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { purchaseRequisitionApi, PurchaseRequisition } from '@/lib/api';

export default function PurchaseRequisitionList() {
    const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchPrs();
    }, []);

    const fetchPrs = async () => {
        try {
            setLoading(true);
            const data = await purchaseRequisitionApi.getAll();
            setPrs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Purchase Requisitions</h1>
                <Link href="/erp/procurement/purchase-requisition/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create PR
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Requisitions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PR Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : prs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No requisitions found.</TableCell>
                                </TableRow>
                            ) : (
                                prs.map((pr) => (
                                    <TableRow key={pr.id}>
                                        <TableCell className="font-medium">{pr.prNumber}</TableCell>
                                        <TableCell>{new Date(pr.requestDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{pr.requestedBy}</TableCell>
                                        <TableCell>{pr.department || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                pr.status === 'APPROVED' ? 'default' :
                                                    pr.status === 'REJECTED' ? 'destructive' :
                                                        pr.status === 'SUBMITTED' ? 'outline' : 'secondary'
                                            }>
                                                {pr.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/erp/purchase-requisition/${pr.id}`}>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
