"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft, Plus, Ticket, CheckCircle2, XCircle,
    Trash2, Copy, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

import { formatCurrency } from "@/lib/utils";

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

interface Voucher {
    id: string;
    code: string;
    description?: string;
    discountValue: number;
    usedCount: number;
    maxUses: number;
    isActive: boolean;
    expiresAt?: string;
    createdAt: string;
}

export default function PosVouchersPage() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('pos.voucher.create');
    const canVoid = hasPermission('pos.voucher.void');
    const canDelete = hasPermission('pos.voucher.delete');
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Issue modal
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [amount, setAmount] = useState<number | "">("");
    const [description, setDescription] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [isIssuing, setIsIssuing] = useState(false);
    const [issuedVoucher, setIssuedVoucher] = useState<Voucher | null>(null);

    // Delete confirm
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchVouchers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authFetch("/pos-config/vouchers");
            if (res.ok && res.data?.status) setVouchers(res.data.data || []);
        } catch { toast.error("Failed to load vouchers"); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

    const handleIssue = async () => {
        if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
        setIsIssuing(true);
        try {
            const res = await authFetch("/pos-config/vouchers", {
                method: "POST",
                body: { amount: Number(amount), description: description || undefined, expiresAt: expiresAt || undefined },
            });
            if (res.ok && res.data?.status) {
                setIssuedVoucher(res.data.data);
                setShowIssueModal(false);
                setAmount(""); setDescription(""); setExpiresAt("");
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to issue voucher");
            }
        } catch { toast.error("Failed to issue voucher"); }
        finally { setIsIssuing(false); }
    };

    const handleDeactivate = async (id: string) => {
        try {
            const res = await authFetch(`/pos-config/vouchers/${id}/deactivate`, { method: "PUT" });
            if (res.ok && res.data?.status) {
                toast.success("Voucher deactivated");
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to deactivate");
            }
        } catch { toast.error("Failed to deactivate voucher"); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await authFetch(`/pos-config/vouchers/${deleteId}`, { method: "DELETE" });
            if (res.ok && res.data?.status) {
                toast.success("Voucher deleted");
                setDeleteId(null);
                fetchVouchers();
            } else {
                toast.error(res.data?.message || "Failed to delete");
            }
        } catch { toast.error("Failed to delete voucher"); }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Copied: ${code}`);
    };

    return (
        <div className="min-h-screen font-inter">
            {/* HEADER */}
            <div className="max-w-5xl mx-auto pt-6 px-4 mb-6">
                <div className="bg-card rounded-[32px] p-4 flex items-center justify-between shadow-sm border border-border">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/pos/new-sale")}
                            className="text-muted-foreground hover:bg-accent rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Vouchers</h1>
                            <p className="text-sm text-muted-foreground">Issue and manage discount vouchers redeemable at any POS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={fetchVouchers} className="rounded-full text-muted-foreground">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => setShowIssueModal(true)} className="rounded-full px-6 gap-2" disabled={!canCreate}>
                            <Plus className="w-4 h-4" /> Issue Voucher
                        </Button>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="max-w-5xl mx-auto px-4">
                <div className="bg-card rounded-[32px] p-8 shadow-sm border border-border">
                    {isLoading ? (
                        <p className="text-muted-foreground text-sm text-center py-8">Loading vouchers...</p>
                    ) : vouchers.length === 0 ? (
                        <div className="text-center py-12">
                            <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">No vouchers issued yet.</p>
                            <Button onClick={() => setShowIssueModal(true)} className="rounded-full px-8 mt-4" disabled={!canCreate}>
                                Issue First Voucher
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Code</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Used</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Issued</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vouchers.map((v) => {
                                        const isRedeemed = v.usedCount >= v.maxUses;
                                        const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
                                        const statusLabel = !v.isActive ? "Void" : isRedeemed ? "Redeemed" : isExpired ? "Expired" : "Active";
                                        const statusClass = !v.isActive ? "bg-muted text-muted-foreground border-border"
                                            : isRedeemed ? "bg-blue-500/10 text-blue-700 border-blue-300"
                                            : isExpired ? "bg-amber-500/10 text-amber-700 border-amber-300"
                                            : "bg-emerald-500/10 text-emerald-700 border-emerald-300";

                                        return (
                                            <TableRow key={v.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-primary">{v.code}</span>
                                                        <button onClick={() => copyCode(v.code)}
                                                            className="text-muted-foreground hover:text-foreground transition-colors">
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                                    {v.description || "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(Number(v.discountValue))}
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {v.usedCount}/{v.maxUses}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {v.expiresAt ? fmtDate(v.expiresAt) : "No expiry"}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {fmtDate(v.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5", statusClass)}>
                                                        {statusLabel}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {v.isActive && !isRedeemed && canVoid && (
                                                            <Button variant="ghost" size="icon"
                                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                                                                title="Void voucher"
                                                                onClick={() => handleDeactivate(v.id)}>
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                        {!isRedeemed && canDelete && (
                                                            <Button variant="ghost" size="icon"
                                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                                                                title="Delete voucher"
                                                                onClick={() => setDeleteId(v.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            {/* ISSUE VOUCHER MODAL */}
            <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
                <DialogContent className="sm:max-w-[420px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-primary" /> Issue Voucher
                        </DialogTitle>
                        <DialogDescription>
                            A unique code will be generated. The voucher is redeemable at any POS terminal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Voucher Amount (Rs.) <span className="text-destructive">*</span></Label>
                            <Input type="number" min="1" value={amount}
                                onChange={e => setAmount(e.target.value ? Number(e.target.value) : "")}
                                className="rounded-xl h-12 text-lg px-4 bg-muted/30 border-transparent focus-visible:ring-primary"
                                placeholder="e.g. 500" autoFocus />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)}
                                className="rounded-xl bg-muted/30 border-transparent focus-visible:ring-primary"
                                placeholder="e.g. Goodwill voucher for return" />
                        </div>
                        <div className="space-y-2">
                            <Label>Expiry Date (Optional)</Label>
                            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                                className="rounded-xl bg-muted/30 border-transparent focus-visible:ring-primary"
                                min={new Date().toISOString().split("T")[0]} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowIssueModal(false)} className="rounded-full">Cancel</Button>
                        <Button onClick={handleIssue} disabled={isIssuing} className="rounded-full px-8 gap-2">
                            <Ticket className="w-4 h-4" />
                            {isIssuing ? "Issuing..." : "Issue Voucher"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ISSUED CONFIRMATION MODAL */}
            {issuedVoucher && (
                <Dialog open onOpenChange={() => setIssuedVoucher(null)}>
                    <DialogContent className="sm:max-w-[380px] rounded-3xl" showCloseButton={false}>
                        <div className="pt-6 pb-2 text-center">
                            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                            <h2 className="text-2xl font-bold mb-1">Voucher Issued</h2>
                            <p className="text-muted-foreground mb-5">Share this code with the customer</p>
                            <div className="bg-muted/50 rounded-2xl p-5 border border-border mb-5">
                                <p className="text-3xl font-black font-mono tracking-widest text-primary">
                                    {issuedVoucher.code}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {formatCurrency(Number(issuedVoucher.discountValue))} · Single use · Any terminal
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { copyCode(issuedVoucher.code); }}
                                    className="flex-1 rounded-full gap-2">
                                    <Copy className="w-4 h-4" /> Copy Code
                                </Button>
                                <Button onClick={() => setIssuedVoucher(null)} className="flex-1 rounded-full">
                                    Done
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* DELETE CONFIRM */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the voucher. Only unused vouchers can be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
