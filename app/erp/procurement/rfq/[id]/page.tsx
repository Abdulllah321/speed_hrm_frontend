import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getRfq } from '@/lib/actions/rfq';
import { getVendors } from '@/lib/actions/procurement';
import { RfqDetailClient } from './rfq-detail-client';
import { notFound } from 'next/navigation';
import { RequestForQuotation, PurchaseRequisitionItem, RfqVendor } from '@/lib/api';

export default async function RfqDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch data in parallel
    const [rfqResult, suppliersResult] = await Promise.all([
        getRfq(id),
        getVendors()
    ]);

    const rfq = rfqResult as RequestForQuotation;
    const suppliers = suppliersResult.status !== false ? (suppliersResult.data || []) : [];

    if (!rfq || (rfq as any).status === false) {
        notFound();
    }

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
                    <Link href="/erp/procurement/rfq">
                        <Button variant="outline">Back</Button>
                    </Link>
                    <RfqDetailClient rfq={rfq} suppliers={suppliers} />
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
                            {rfq.purchaseRequisition?.items.map((item: PurchaseRequisitionItem) => (
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
                                rfq.vendors.map((v: RfqVendor) => (
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
