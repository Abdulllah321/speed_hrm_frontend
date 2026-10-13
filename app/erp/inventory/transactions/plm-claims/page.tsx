'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { getTransferRequests, acknowledgeClaimTransfer } from '@/lib/actions/transfer-request';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { PermissionGuard } from '@/components/auth/permission-guard';
import Link from 'next/link';
import { authFetch } from '@/lib/auth';

interface TransferRequest {
    id: string;
    requestNo: string;
    status: string;
    transferType: string;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: { name: string };
    fromWarehouse?: { name: string; code: string };
    toWarehouse?: { name: string; code: string };
    fromLocation?: { name: string; code: string };
    toLocation?: { name: string; code: string };
    isClaimDirect?: boolean;
    items: Array<{
        id: string;
        quantity: number;
        item: {
            sku: string;
            description: string;
            color?: { name: string } | null;
            size?: { name: string } | null;
        };
    }>;
    claim?: {
        claimNo: string;
        claimType: string;
    };
}

export default function PLMClaimsPage() {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<TransferRequest[]>([]);
    const [completedRequests, setCompletedRequests] = useState<TransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

    useEffect(() => {
        loadClaimTransfers();
    }, []);

    const loadClaimTransfers = async () => {
        setLoading(true);
        try {
            const [transferRes, claimsRes] = await Promise.all([
                getTransferRequests(),
                authFetch('/pos-claims?status=APPROVED'),
            ]);
            
            const pending: any[] = [];
            const completed: any[] = [];

            // 1. Claims awaiting PLM Acknowledgment (Approved/Partial)
            if (claimsRes.ok && claimsRes.data?.data) {
                const claims = claimsRes.data.data;
                for (const c of claims) {
                    if (c.status === 'APPROVED' || c.status === 'PARTIALLY_APPROVED') {
                        pending.push({
                            id: c.id,
                            isClaimDirect: true,
                            requestNo: c.claimNumber,
                            status: 'PENDING',
                            transferType: 'CLAIM_TO_PLM',
                            createdAt: c.createdAt,
                            fromLocation: c.salesOrder?.location || { name: 'Outlet Store', code: 'OUTLET' },
                            toLocation: { name: 'PLM Location', code: 'C20001' },
                            items: (c.items || []).filter((i: any) => ['APPROVED', 'PARTIALLY_APPROVED'].includes(i.itemStatus)).map((i: any) => ({
                                id: i.id,
                                quantity: i.approvedQty,
                                item: i.item || { sku: 'ITEM', description: 'Claim Item' },
                            })),
                            claim: {
                                claimNo: c.claimNumber,
                                claimType: c.claimType,
                            },
                        });
                    }
                }
            }

            // 2. Transfers from Transfer Requests
            if (transferRes.status && transferRes.data) {
                const claimTransfers = transferRes.data.filter(
                    (req: TransferRequest) => req.transferType === 'CLAIM_TO_PLM'
                );

                const pendingTrs = claimTransfers.filter((req: TransferRequest) => req.status === 'PENDING');
                const completedTrs = claimTransfers.filter((req: TransferRequest) => req.status === 'COMPLETED' || req.status === 'APPROVED');

                for (const tr of pendingTrs) {
                    if (!pending.some((p: any) => p.claim?.claimNo === tr.claim?.claimNo)) {
                        pending.push(tr);
                    }
                }
                completed.push(...completedTrs);
            }

            setPendingRequests(pending);
            setCompletedRequests(completed);
        } catch (error) {
            console.error('Failed to load claim transfers:', error);
            toast.error('Failed to load claim transfers');
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (request: TransferRequest) => {
        if (!user?.id) {
            toast.error('User not authenticated');
            return;
        }

        setAcknowledgingId(request.id);
        try {
            let result: any;
            if (request.isClaimDirect) {
                const res = await authFetch(`/pos-claims/${request.id}/acknowledge`, { method: 'POST' });
                result = res.data;
            } else {
                result = await acknowledgeClaimTransfer(request.id, user.id);
            }

            if (result && result.status) {
                toast.success('✅ Claim acknowledged! POS Return, Claim Voucher and PLM inventory updated.');
                loadClaimTransfers();
            } else {
                toast.error(result?.message || 'Failed to acknowledge claim');
            }
        } catch (error) {
            console.error('Error acknowledging claim:', error);
            toast.error('Failed to acknowledge claim');
        } finally {
            setAcknowledgingId(null);
        }
    };

    const renderTransferCard = (request: TransferRequest, isPending: boolean) => (
        <Card key={request.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            {request.requestNo}
                        </CardTitle>
                        {request.claim && (
                            <p className="text-sm text-muted-foreground">
                                Claim: <span className="font-semibold">{request.claim.claimNo}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                    {request.claim.claimType}
                                </Badge>
                            </p>
                        )}
                    </div>
                    <Badge 
                        variant={isPending ? "secondary" : "default"}
                        className={isPending ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}
                    >
                        {isPending ? (
                            <>
                                <Clock className="h-3 w-3 mr-1" />
                                PENDING
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                COMPLETED
                            </>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Transfer Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">From</p>
                        <p className="font-medium">
                            {request.fromLocation?.name || request.fromWarehouse?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {request.fromLocation?.code || request.fromWarehouse?.code || ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">To</p>
                        <p className="font-medium">
                            {request.toWarehouse?.name || request.toLocation?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {request.toWarehouse?.code || request.toLocation?.code || ''}
                        </p>
                    </div>
                </div>

                {/* Review Remarks */}
                {(request.claim?.reviewNotes || request.notes) && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-xs space-y-0.5">
                        <span className="font-bold text-amber-800 dark:text-amber-300 block">
                            ERP Review Remarks:
                        </span>
                        <p className="text-foreground font-medium whitespace-pre-wrap">
                            {request.claim?.reviewNotes || request.notes}
                        </p>
                    </div>
                )}

                {/* Items */}
                <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Items ({request.items.length})</p>
                    <div className="space-y-2">
                        {request.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                                <div>
                                    <p className="text-sm font-medium">{item.item.sku}</p>
                                    <p className="text-xs text-muted-foreground">{item.item.description}</p>
                                    {(item.item.color?.name || item.item.size?.name) && (
                                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                            {item.item.color?.name && (
                                                <span>
                                                    Color: <span className="font-medium text-foreground">{item.item.color.name}</span>
                                                </span>
                                            )}
                                            {item.item.color?.name && item.item.size?.name && <span>•</span>}
                                            {item.item.size?.name && (
                                                <span>
                                                    Size: <span className="font-medium text-foreground">{item.item.size.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Badge variant="outline" className="font-semibold">
                                    Qty: {item.quantity}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timestamps */}
                <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
                    <p>Created: {format(new Date(request.createdAt), 'dd MMM yyyy, h:mm a')}</p>
                    {request.approvedAt && (
                        <p>
                            Acknowledged: {format(new Date(request.approvedAt), 'dd MMM yyyy, h:mm a')}
                            {request.approvedBy && <span className="ml-1">by {request.approvedBy.name}</span>}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {isPending ? (
                        <Button
                            onClick={() => handleAcknowledge(request)}
                            disabled={acknowledgingId === request.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {acknowledgingId === request.id ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Acknowledge Receipt
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Inventory Updated
                        </div>
                    )}
                    {request.isClaimDirect ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/erp/claims" target="_blank">
                                <FileText className="h-4 w-4 mr-1" />
                                Claim Detail
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/erp/inventory/transactions/claim-transfer/slip/${request.id}`} target="_blank">
                                <FileText className="h-4 w-4 mr-1" />
                                View Slip
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <PermissionGuard permissions="erp.inventory.warehouse.view">
            <div className="flex-1 space-y-6 p-8 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">PLM Claim Transfers</h2>
                        <p className="text-muted-foreground">
                            Manage defective items received from POS outlets
                        </p>
                    </div>
                    <Button variant="outline" onClick={loadClaimTransfers} disabled={loading}>
                        {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-l-4 border-l-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Acknowledgment</CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : pendingRequests.length}</div>
                            <p className="text-xs text-muted-foreground">Awaiting PLM receipt confirmation</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : completedRequests.length}</div>
                            <p className="text-xs text-muted-foreground">Successfully acknowledged and added to inventory</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'pending'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Pending ({pendingRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'completed'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Completed ({completedRequests.length})
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-2">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                            <p className="text-muted-foreground">Loading claim transfers...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeTab === 'pending' ? (
                            pendingRequests.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Pending Claims</h3>
                                    <p className="text-muted-foreground text-center max-w-md">
                                        All claim transfers have been acknowledged. New transfers will appear here when created.
                                    </p>
                                </div>
                            ) : (
                                pendingRequests.map((request) => renderTransferCard(request, true))
                            )
                        ) : (
                            completedRequests.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Completed Claims</h3>
                                    <p className="text-muted-foreground text-center max-w-md">
                                        Acknowledged claims will appear here.
                                    </p>
                                </div>
                            ) : (
                                completedRequests.map((request) => renderTransferCard(request, false))
                            )
                        )}
                    </div>
                )}
            </div>
        </PermissionGuard>
    );
}
