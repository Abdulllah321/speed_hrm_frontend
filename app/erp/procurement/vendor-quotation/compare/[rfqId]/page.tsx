'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { vendorQuotationApi, VendorQuotation } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export default function CompareQuotations({ params }: { params: { rfqId: string } }) {
    const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const rfqId = params.rfqId;

    useEffect(() => {
        fetchComparison();
    }, [rfqId]);

    const fetchComparison = async () => {
        try {
            setLoading(true);
            const data = await vendorQuotationApi.compare(rfqId);
            setQuotations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (quotationId: string) => {
        try {
            await vendorQuotationApi.select(quotationId);
            fetchComparison(); // Refresh
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (quotations.length === 0) return <div className="p-6">No quotations to compare.</div>;

    // Get all unique items from all quotations
    const allItems = quotations[0]?.rfq?.purchaseRequisition?.items || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compare Quotations</h1>
                    <p className="text-muted-foreground">RFQ: {quotations[0]?.rfq?.rfqNumber}</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>Back</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Price Comparison</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">Item</TableHead>
                                {quotations.map((q) => (
                                    <TableHead key={q.id} className="text-center min-w-[150px]">
                                        <div className="font-semibold">{q.vendor.name}</div>
                                        <Badge className="mt-1" variant={
                                            q.status === 'SELECTED' ? 'default' :
                                                q.status === 'REJECTED' ? 'destructive' : 'outline'
                                        }>
                                            {q.status}
                                        </Badge>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allItems.map((prItem) => (
                                <TableRow key={prItem.id}>
                                    <TableCell className="font-medium">
                                        <div>{prItem.itemId}</div>
                                        <div className="text-sm text-muted-foreground">{prItem.description || '-'}</div>
                                        <div className="text-sm text-muted-foreground">Qty: {prItem.requiredQty}</div>
                                    </TableCell>
                                    {quotations.map((quotation) => {
                                        const item = quotation.items.find(i => i.itemId === prItem.itemId);
                                        return (
                                            <TableCell key={quotation.id} className="text-center">
                                                {item ? (
                                                    <div>
                                                        <div className="font-semibold text-lg">${parseFloat(item.unitPrice).toFixed(2)}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Qty: {item.quotedQty}
                                                        </div>
                                                        {parseFloat(item.taxPercent) > 0 && (
                                                            <div className="text-xs text-muted-foreground">Tax: {item.taxPercent}%</div>
                                                        )}
                                                        {parseFloat(item.discountPercent) > 0 && (
                                                            <div className="text-xs text-green-600">Disc: {item.discountPercent}%</div>
                                                        )}
                                                        <div className="text-sm font-medium mt-1">
                                                            Total: ${parseFloat(item.lineTotal).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                            <TableRow className="bg-muted/50">
                                <TableCell className="font-bold">Grand Total</TableCell>
                                {quotations.map((quotation) => (
                                    <TableCell key={quotation.id} className="text-center">
                                        <div className="text-xl font-bold">${parseFloat(quotation.totalAmount).toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Subtotal: ${parseFloat(quotation.subtotal).toFixed(2)}
                                        </div>
                                        {parseFloat(quotation.taxAmount) > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                Tax: ${parseFloat(quotation.taxAmount).toFixed(2)}
                                            </div>
                                        )}
                                        {parseFloat(quotation.discountAmount) > 0 && (
                                            <div className="text-xs text-green-600">
                                                Discount: -${parseFloat(quotation.discountAmount).toFixed(2)}
                                            </div>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Action</TableCell>
                                {quotations.map((quotation) => (
                                    <TableCell key={quotation.id} className="text-center">
                                        {quotation.status === 'SUBMITTED' && (
                                            <Button onClick={() => handleSelect(quotation.id)} size="sm">
                                                Select This Vendor
                                            </Button>
                                        )}
                                        {quotation.status === 'SELECTED' && (
                                            <Badge variant="default" className="text-sm">Selected</Badge>
                                        )}
                                        {quotation.status === 'REJECTED' && (
                                            <Badge variant="destructive" className="text-sm">Rejected</Badge>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
