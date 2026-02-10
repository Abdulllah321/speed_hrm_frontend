'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { vendorQuotationApi, VendorQuotation } from '@/lib/api';

export default function VendorQuotationDetail({ params }: { params: { id: string } }) {
    const [quotation, setQuotation] = useState<VendorQuotation | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const id = params.id;

    useEffect(() => {
        fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            const data = await vendorQuotationApi.getById(id);
            setQuotation(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await vendorQuotationApi.submit(id);
            fetchQuotation();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async () => {
        try {
            setLoading(true);
            await vendorQuotationApi.select(id);
            fetchQuotation();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !quotation) return <div className="p-6">Loading...</div>;
    if (!quotation) return <div className="p-6">Not found</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Quotation</h1>
                    <p className="text-muted-foreground">
                        {quotation.vendor.name} - RFQ: {quotation.rfq?.rfqNumber}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Back</Button>
                    {quotation.status === 'DRAFT' && (
                        <Button onClick={handleSubmit}>Submit Quotation</Button>
                    )}
                    {quotation.status === 'SUBMITTED' && (
                        <Button onClick={handleSelect}>Select This Quotation</Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent>
                        <Badge className="text-lg px-4 py-1" variant={
                            quotation.status === 'SELECTED' ? 'default' :
                                quotation.status === 'REJECTED' ? 'destructive' :
                                    quotation.status === 'SUBMITTED' ? 'outline' : 'secondary'
                        }>{quotation.status}</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Vendor</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                        <p><strong>{quotation.vendor.name}</strong></p>
                        <p className="text-sm text-muted-foreground">{quotation.vendor.code}</p>
                        <p className="text-sm text-muted-foreground">{quotation.vendor.email || '-'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Amount</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">${parseFloat(quotation.totalAmount).toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                        <p className="text-xl font-semibold">${parseFloat(quotation.subtotal).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Tax Amount</p>
                        <p className="text-xl font-semibold">${parseFloat(quotation.taxAmount).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Discount</p>
                        <p className="text-xl font-semibold text-green-600">-${parseFloat(quotation.discountAmount).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Grand Total</p>
                        <p className="text-2xl font-bold">${parseFloat(quotation.totalAmount).toFixed(2)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quoted Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item ID</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Tax %</TableHead>
                                <TableHead>Disc %</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotation.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.itemId}</TableCell>
                                    <TableCell>{item.description || '-'}</TableCell>
                                    <TableCell>{item.quotedQty}</TableCell>
                                    <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                                    <TableCell>{item.taxPercent}%</TableCell>
                                    <TableCell>{item.discountPercent}%</TableCell>
                                    <TableCell className="text-right font-semibold">${parseFloat(item.lineTotal).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {quotation.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{quotation.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
