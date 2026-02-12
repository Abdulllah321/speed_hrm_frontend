
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { purchaseRequisitionApi, PurchaseRequisition } from '@/lib/api';

export default function PurchaseRequisitionDetail({ params }: { params: { id: string } }) {
    const [pr, setPr] = useState<PurchaseRequisition | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const id = params.id;

    useEffect(() => {
        fetchPr();
    }, [id]);

    const fetchPr = async () => {
        try {
            setLoading(true);
            const data = await purchaseRequisitionApi.getById(id);
            setPr(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            setLoading(true);
            await purchaseRequisitionApi.update(id, { status: newStatus });
            fetchPr(); // Refresh
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!pr) return <div className="p-6">Not found</div>;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{pr.prNumber}</h1>
                    <p className="text-muted-foreground">Requested by {pr.requestedBy} on {new Date(pr.requestDate).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Back</Button>
                    {pr.status === 'DRAFT' && (
                        <Button onClick={() => handleStatusChange('SUBMITTED')}>Submit for Approval</Button>
                    )}
                    {pr.status === 'SUBMITTED' && (
                        <>
                            <Button variant="destructive" onClick={() => handleStatusChange('REJECTED')}>Reject</Button>
                            <Button onClick={() => handleStatusChange('APPROVED')}>Approve</Button>
                        </>
                    )}
                    {/* Only show Convert button if APPROVED */}
                    {pr.status === 'APPROVED' && (
                        <Button variant="secondary" disabled>Convert to RFQ (Coming Soon)</Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent>
                        <Badge className="text-lg px-4 py-1" variant={
                            pr.status === 'APPROVED' ? 'default' :
                                pr.status === 'REJECTED' ? 'destructive' :
                                    pr.status === 'SUBMITTED' ? 'outline' : 'secondary'
                        }>{pr.status}</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><strong>Department:</strong> {pr.department || '-'}</p>
                        <p><strong>Notes:</strong> {pr.notes || '-'}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item ID</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Needed By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pr.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.itemId}</TableCell>
                                    <TableCell>{item.description || '-'}</TableCell>
                                    <TableCell>{item.requiredQty}</TableCell>
                                    <TableCell>{item.neededByDate ? new Date(item.neededByDate).toLocaleDateString() : '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
