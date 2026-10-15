'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import DataTable from '@/components/common/data-table';
import { ColumnDef } from '@tanstack/react-table';

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
        reviewNotes?: string | null;
        reasonNotes?: string | null;
        reasonCode?: string | null;
    };
    notes?: string | null;
}

export default function PLMClaimsPage() {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<TransferRequest[]>([]);
    const [completedRequests, setCompletedRequests] = useState<TransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('completed');

    useEffect(() => {
        loadClaimTransfers();
    }, []);

    const loadClaimTransfers = async () => {
        setLoading(true);
        try {
            const [transferRes, claimsRes] = await Promise.all([
                getTransferRequests({ transferType: 'CLAIM_TO_PLM', limit: 0 }),
                authFetch('/pos-claims?status=ALL&limit=0'),
            ]);
            
            const pending: any[] = [];
            const completed: any[] = [];

            const claimTransfers: any[] = (transferRes.status && transferRes.data)
                ? transferRes.data.filter((req: TransferRequest) => req.transferType === 'CLAIM_TO_PLM')
                : [];

            const allClaims: any[] = (claimsRes.ok && claimsRes.data?.data)
                ? claimsRes.data.data
                : [];

            // Build map of claims by claimNumber and transferRequestId for quick cross-referencing
            const claimByNumber = new Map<string, any>();
            const claimByTrId = new Map<string, any>();
            for (const c of allClaims) {
                if (c.claimNumber) claimByNumber.set(c.claimNumber, c);
                if (c.transferRequestId) claimByTrId.set(c.transferRequestId, c);
            }

            // Also map transfer requests by id and claimNo
            const trById = new Map<string, any>();
            for (const tr of claimTransfers) {
                if (tr.id) trById.set(tr.id, tr);
            }

            // 1. Process TransferRequests
            for (const tr of claimTransfers) {
                // Enrich review remarks / claim info from claims table if missing
                const matchedClaim = claimByTrId.get(tr.id) || (tr.claim?.claimNo ? claimByNumber.get(tr.claim.claimNo) : null);
                if (matchedClaim) {
                    if (!tr.claim) {
                        tr.claim = {
                            claimNo: matchedClaim.claimNumber,
                            claimType: matchedClaim.claimType,
                            reviewNotes: matchedClaim.reviewNotes,
                            reasonNotes: matchedClaim.reasonNotes,
                            reasonCode: matchedClaim.reasonCode,
                        };
                    } else if (!tr.claim.reviewNotes && matchedClaim.reviewNotes) {
                        tr.claim.reviewNotes = matchedClaim.reviewNotes;
                    }
                }

                if (tr.status === 'COMPLETED' || tr.status === 'APPROVED') {
                    completed.push(tr);
                } else if (tr.status === 'PENDING') {
                    pending.push(tr);
                }
            }

            // 2. Process claims from pos_claims table to catch any not covered by TransferRequest
            for (const c of allClaims) {
                const isClaimCompleted = c.status === 'COMPLETED' || c.status === 'ACKNOWLEDGED';
                const isClaimPending = c.status === 'APPROVED' || c.status === 'PARTIALLY_APPROVED';

                if (isClaimCompleted) {
                    const alreadyInCompleted = completed.some(
                        (item: any) =>
                            (c.transferRequestId && item.id === c.transferRequestId) ||
                            (item.claim?.claimNo && item.claim.claimNo === c.claimNumber) ||
                            item.requestNo === c.claimNumber
                    );

                    if (!alreadyInCompleted) {
                        const tr = c.transferRequestId ? trById.get(c.transferRequestId) : null;
                        completed.push({
                            id: c.transferRequestId || c.id,
                            isClaimDirect: !c.transferRequestId,
                            requestNo: tr?.requestNo || c.claimNumber,
                            status: 'COMPLETED',
                            transferType: 'CLAIM_TO_PLM',
                            createdAt: c.createdAt,
                            approvedAt: c.reviewedAt || c.updatedAt,
                            fromLocation: c.salesOrder?.location || tr?.fromLocation || { name: 'Outlet Store', code: 'OUTLET' },
                            toLocation: tr?.toLocation || { name: 'PRODUCT LINE MANAGEMENT', code: 'C20001' },
                            items: (c.items && c.items.length > 0)
                                ? c.items.map((i: any) => ({
                                    id: i.id,
                                    quantity: i.approvedQty > 0 ? i.approvedQty : (i.claimedQty || 1),
                                    item: i.item || { sku: 'ITEM', description: 'Claim Item' },
                                }))
                                : (tr?.items || []),
                            claim: {
                                claimNo: c.claimNumber,
                                claimType: c.claimType,
                                reviewNotes: c.reviewNotes,
                                reasonNotes: c.reasonNotes,
                                reasonCode: c.reasonCode,
                            },
                            notes: c.reviewNotes,
                        });
                    }
                } else if (isClaimPending) {
                    const alreadyInPending = pending.some(
                        (item: any) =>
                            (c.transferRequestId && item.id === c.transferRequestId) ||
                            (item.claim?.claimNo && item.claim.claimNo === c.claimNumber) ||
                            item.requestNo === c.claimNumber
                    );

                    if (!alreadyInPending) {
                        const tr = c.transferRequestId ? trById.get(c.transferRequestId) : null;
                        pending.push({
                            id: c.id,
                            isClaimDirect: !c.transferRequestId,
                            requestNo: tr?.requestNo || c.claimNumber,
                            status: 'PENDING',
                            transferType: 'CLAIM_TO_PLM',
                            createdAt: c.createdAt,
                            fromLocation: c.salesOrder?.location || tr?.fromLocation || { name: 'Outlet Store', code: 'OUTLET' },
                            toLocation: tr?.toLocation || { name: 'PRODUCT LINE MANAGEMENT', code: 'C20001' },
                            items: (c.items || [])
                                .filter((i: any) => ['APPROVED', 'PARTIALLY_APPROVED'].includes(i.itemStatus) || i.approvedQty > 0)
                                .map((i: any) => ({
                                    id: i.id,
                                    quantity: i.approvedQty || i.claimedQty,
                                    item: i.item || { sku: 'ITEM', description: 'Claim Item' },
                                })),
                            claim: {
                                claimNo: c.claimNumber,
                                claimType: c.claimType,
                                reviewNotes: c.reviewNotes,
                                reasonNotes: c.reasonNotes,
                                reasonCode: c.reasonCode,
                            },
                            notes: c.reviewNotes,
                        });
                    }
                }
            }

            // Sort newest first by createdAt
            pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            completed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    const columns: ColumnDef<TransferRequest>[] = useMemo(
        () => [
            {
                accessorKey: 'requestNo',
                header: 'Transfer / STN #',
                cell: ({ row }) => {
                    const req = row.original;
                    return (
                        <div className="font-semibold flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <span>{req.requestNo}</span>
                        </div>
                    );
                },
            },
            {
                id: 'claimNo',
                accessorFn: (row) => row.claim?.claimNo || row.requestNo,
                header: 'Claim No',
                cell: ({ row }) => {
                    const req = row.original;
                    const claimNo = req.claim?.claimNo || req.requestNo;
                    return (
                        <div className="space-y-1">
                            <div className="font-medium text-sm">{claimNo}</div>
                            {req.claim?.claimType && (
                                <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-normal">
                                    {req.claim.claimType}
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'fromLocation',
                accessorFn: (row) => row.fromLocation?.name || row.fromWarehouse?.name || '',
                header: 'From Outlet',
                cell: ({ row }) => {
                    const req = row.original;
                    const loc = req.fromLocation || req.fromWarehouse;
                    return (
                        <div>
                            <p className="font-medium text-sm">{loc?.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{loc?.code || ''}</p>
                        </div>
                    );
                },
            },
            {
                id: 'toLocation',
                accessorFn: (row) => row.toLocation?.name || row.toWarehouse?.name || '',
                header: 'To Location',
                cell: ({ row }) => {
                    const req = row.original;
                    const loc = req.toWarehouse || req.toLocation;
                    return (
                        <div>
                            <p className="font-medium text-sm">{loc?.name || 'PLM (C20001)'}</p>
                            <p className="text-xs text-muted-foreground">{loc?.code || 'C20001'}</p>
                        </div>
                    );
                },
            },
            {
                id: 'items',
                header: 'Items',
                cell: ({ row }) => {
                    const req = row.original;
                    return (
                        <div className="space-y-1 max-w-[280px]">
                            {req.items?.map((it) => (
                                <div key={it.id} className="text-xs flex items-center justify-between gap-2 border-b border-muted/50 pb-0.5 last:border-b-0">
                                    <span className="font-medium truncate">{it.item?.sku || 'ITEM'}</span>
                                    {(it.item?.color?.name || it.item?.size?.name) && (
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {[it.item.color?.name, it.item.size?.name].filter(Boolean).join(' • ')}
                                        </span>
                                    )}
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono shrink-0">
                                        Qty: {it.quantity}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'reviewNotes',
                accessorFn: (row) => row.claim?.reviewNotes || (row as any).notes || '',
                header: 'ERP Remarks',
                cell: ({ row }) => {
                    const notes = row.original.claim?.reviewNotes || (row.original as any).notes;
                    if (!notes) return <span className="text-xs text-muted-foreground italic">-</span>;
                    return (
                        <div className="max-w-[220px] text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 p-1.5 rounded border border-amber-200 dark:border-amber-800 font-medium whitespace-pre-wrap">
                            {notes}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const isPending = row.original.status === 'PENDING';
                    return (
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
                    );
                },
            },
            {
                accessorKey: 'createdAt',
                header: 'Date',
                cell: ({ row }) => {
                    const d = row.original.approvedAt || row.original.createdAt;
                    return (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {d ? format(new Date(d), 'dd MMM yyyy, h:mm a') : '-'}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: 'Action',
                cell: ({ row }) => {
                    const req = row.original;
                    const isPending = req.status === 'PENDING';
                    if (isPending) {
                        return (
                            <Button
                                size="sm"
                                onClick={() => handleAcknowledge(req)}
                                disabled={acknowledgingId === req.id}
                                className="bg-green-600 hover:bg-green-700 h-8 text-xs whitespace-nowrap"
                            >
                                {acknowledgingId === req.id ? 'Processing...' : (
                                    <>
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Acknowledge
                                    </>
                                )}
                            </Button>
                        );
                    }
                    return req.isClaimDirect ? (
                        <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" asChild>
                            <Link href="/erp/claims" target="_blank">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Claim Detail
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" asChild>
                            <Link href={`/erp/inventory/transactions/claim-transfer/slip/${req.id}`} target="_blank">
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                View Slip
                            </Link>
                        </Button>
                    );
                },
            },
        ],
        [acknowledgingId]
    );

    const activeList = activeTab === 'pending' ? pendingRequests : completedRequests;

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
                <div className="flex items-center border-b pb-1 gap-2">
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

                {/* Content — always table with built-in search & filter */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-2">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                            <p className="text-muted-foreground">Loading claim transfers...</p>
                        </div>
                    </div>
                ) : activeList.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                        {activeTab === 'pending' ? (
                            <>
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Pending Claims</h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    All claim transfers have been acknowledged. New transfers will appear here when created.
                                </p>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Completed Claims</h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    Acknowledged claims will appear here.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="rounded-md border bg-card p-3 shadow-sm">
                        <DataTable
                            tableId={`plm-claims-table-${activeTab}`}
                            columns={columns}
                            data={activeList}
                            isLoading={loading}
                            canBulkEdit={false}
                            canBulkDelete={false}
                            canRowEdit={false}
                            canRowDelete={false}
                            searchFields={[
                                { key: 'requestNo', label: 'Transfer / STN #' },
                                { key: 'claimNo', label: 'Claim No' },
                                { key: 'fromLocation', label: 'From Outlet' },
                                { key: 'reviewNotes', label: 'ERP Remarks' },
                            ]}
                            filters={[
                                {
                                    key: 'status',
                                    label: 'Status',
                                    options: [
                                        { label: 'All', value: '' },
                                        { label: 'Pending', value: 'PENDING' },
                                        { label: 'Completed', value: 'COMPLETED' },
                                        { label: 'Approved', value: 'APPROVED' },
                                    ],
                                },
                            ]}
                        />
                    </div>
                )}
            </div>
        </PermissionGuard>
    );
}
