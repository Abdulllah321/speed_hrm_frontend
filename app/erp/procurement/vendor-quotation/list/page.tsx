'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { vendorQuotationApi, VendorQuotation } from '@/lib/api';
import { toast } from 'sonner';

export default function AllVendorQuotationList() {
    const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const data = await vendorQuotationApi.getAll();
            setQuotations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Vendor Quotations</h1>
                <Link href="/erp/procurement/vendor-quotation/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Quotation
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Received Quotations</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quotation #</TableHead>
                                <TableHead>RFQ #</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : quotations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">No quotations found.</TableCell>
                                </TableRow>
                            ) : (
                                quotations.map((quotation) => (
                                    <TableRow key={quotation.id}>
                                        <TableCell className="font-medium">{quotation.id.substring(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Link href={`/erp/procurement/rfq/${quotation.rfqId}`} className="text-blue-600 hover:underline">
                                                {quotation.rfq?.rfqNumber || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{quotation.vendor?.name || '-'}</TableCell>
                                        <TableCell>{new Date(quotation.quotationDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{quotation.items.length} item(s)</TableCell>
                                        <TableCell className="font-semibold">${parseFloat(quotation.totalAmount).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                quotation.status === 'SELECTED' ? 'default' :
                                                    quotation.status === 'REJECTED' ? 'destructive' :
                                                        quotation.status === 'SUBMITTED' ? 'outline' : 'secondary'
                                            }>
                                                {quotation.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Link href={`/erp/procurement/vendor-quotation/${quotation.id}`}>
                                                    <Button variant="ghost" size="sm">View</Button>
                                                </Link>
                                                {quotation.status === 'DRAFT' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                await vendorQuotationApi.submit(quotation.id);
                                                                toast.success('Quotation submitted');
                                                                fetchQuotations();
                                                            } catch (error) {
                                                                toast.error('Failed to submit');
                                                            }
                                                        }}
                                                    >
                                                        Submit
                                                    </Button>
                                                )}
                                            </div>
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
