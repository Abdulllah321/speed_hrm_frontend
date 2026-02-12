import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { getPurchaseRequisitions } from '@/lib/actions/purchase-requisition';
import { PurchaseRequisition } from '@/lib/api';

export default async function PurchaseRequisitionList() {
    const prs = await getPurchaseRequisitions();

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
                            {(!prs || prs.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No requisitions found.</TableCell>
                                </TableRow>
                            ) : (
                                prs.map((pr: PurchaseRequisition) => (
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
                                            <Link href={`/erp/procurement/purchase-requisition/${pr.id}`}>
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
