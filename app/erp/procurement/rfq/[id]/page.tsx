'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { rfqApi, RequestForQuotation } from '@/lib/api';
import { fetchApi } from '@/lib/api';

interface Supplier {
    id: string;
    code: string;
    name: string;
    email?: string;
    contactNo?: string;
}

export default function RfqDetail({ params }: { params: { id: string } }) {
    const [rfq, setRfq] = useState<RequestForQuotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const router = useRouter();
    const id = params.id;

    useEffect(() => {
        fetchRfq();
        fetchSuppliers();
    }, [id]);

    const fetchRfq = async () => {
        try {
            setLoading(true);
            const data = await rfqApi.getById(id);
            setRfq(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await fetchApi<{ status: boolean; data: Supplier[] }>('/suppliers');
            setSuppliers(response.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddVendors = async () => {
        try {
            setLoading(true);
            await rfqApi.addVendors(id, selectedVendors);
            setSelectedVendors([]);
            setDialogOpen(false);
            fetchRfq();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsSent = async () => {
        try {
            setLoading(true);
            await rfqApi.markAsSent(id);
            fetchRfq();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !rfq) return <div className="p-6">Loading...</div>;
    if (!rfq) return <div className="p-6">Not found</div>;

    const existingVendorIds = rfq.vendors.map(v => v.vendorId);
    const availableSuppliers = suppliers.filter(s => !existingVendorIds.includes(s.id));

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{rfq.rfqNumber}</h1>
                    <p className="text-muted-foreground">
                        Created from PR: {rfq.purchaseRequisition?.prNumber} on {new Date(rfq.rfqDate).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Back</Button>
                    {rfq.status === 'DRAFT' && (
                        <>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary">Add Vendors</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Select Vendors</DialogTitle>
                                    </DialogHeader>
                                    <div className="max-h-96 overflow-y-auto space-y-2">
                                        {availableSuppliers.length === 0 ? (
                                            <p className="text-muted-foreground">All suppliers have been added.</p>
                                        ) : (
                                            availableSuppliers.map((supplier) => (
                                                <div key={supplier.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                                    <Checkbox
                                                        id={supplier.id}
                                                        checked={selectedVendors.includes(supplier.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedVendors([...selectedVendors, supplier.id]);
                                                            } else {
                                                                setSelectedVendors(selectedVendors.filter(id => id !== supplier.id));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={supplier.id} className="flex-1 cursor-pointer">
                                                        <div className="font-medium">{supplier.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {supplier.code} | {supplier.email || 'No email'} | {supplier.contactNo || 'No contact'}
                                                        </div>
                                                    </label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddVendors} disabled={selectedVendors.length === 0}>
                                            Add {selectedVendors.length} Vendor(s)
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={handleMarkAsSent} disabled={rfq.vendors.length === 0}>
                                Mark as Sent
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent>
                        <Badge className="text-lg px-4 py-1" variant={
                            rfq.status === 'SENT' ? 'default' :
                                rfq.status === 'CLOSED' ? 'secondary' : 'outline'
                        }>{rfq.status}</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><strong>Notes:</strong> {rfq.notes || '-'}</p>
                        <p><strong>Vendors:</strong> {rfq.vendors.length}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Items (from PR)</CardTitle>
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
                            {rfq.purchaseRequisition?.items.map((item) => (
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

            <Card>
                <CardHeader>
                    <CardTitle>Vendors</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Sent At</TableHead>
                                <TableHead>Response</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rfq.vendors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No vendors added yet.</TableCell>
                                </TableRow>
                            ) : (
                                rfq.vendors.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">{v.vendor.code}</TableCell>
                                        <TableCell>{v.vendor.name}</TableCell>
                                        <TableCell>{v.vendor.email || '-'}</TableCell>
                                        <TableCell>{v.vendor.contactNo || '-'}</TableCell>
                                        <TableCell>{v.sentAt ? new Date(v.sentAt).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={v.responseStatus === 'RESPONDED' ? 'default' : 'outline'}>
                                                {v.responseStatus}
                                            </Badge>
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
