"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BookOpen, Search, Loader2, Plus, Minus, CreditCard,
    TrendingUp, TrendingDown, ArrowUpDown, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth";

function fmt(v: number) { return v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const TX_META: Record<string, { label: string; icon: any; cls: string }> = {
    SALE:       { label: "Sale",       icon: TrendingUp,   cls: "text-destructive" },
    PAYMENT:    { label: "Payment",    icon: CheckCircle2, cls: "text-emerald-600" },
    RETURN:     { label: "Return",     icon: TrendingDown, cls: "text-emerald-600" },
    EXCHANGE:   { label: "Exchange",   icon: ArrowUpDown,  cls: "text-blue-600" },
    ADJUSTMENT: { label: "Adjustment", icon: ArrowUpDown,  cls: "text-amber-600" },
};

export default function CustomerLedgerPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Selected customer detail
    const [selected, setSelected] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txMeta, setTxMeta] = useState<any>(null);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    // Payment modal
    const [showPayment, setShowPayment] = useState(false);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payNotes, setPayNotes] = useState("");
    const [isPaying, setIsPaying] = useState(false);

    // Credit limit modal
    const [showCreditLimit, setShowCreditLimit] = useState(false);
    const [newLimit, setNewLimit] = useState<number>(0);
    const [isSettingLimit, setIsSettingLimit] = useState(false);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authFetch("/customer-ledger", { params: { limit: 200 } });
            if (res.ok && res.data?.status) setAccounts(res.data.data || []);
        } catch { toast.error("Failed to load credit accounts"); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    const openAccount = useCallback(async (account: any) => {
        setSelected(account);
        setIsLoadingTx(true);
        try {
            const res = await authFetch(`/customer-ledger/customer/${account.customer.id}/entries`, { params: { limit: 100 } });
            if (res.ok && res.data?.status) {
                setTransactions(res.data.data || []);
                setTxMeta(res.data);
            }
        } catch { toast.error("Failed to load transactions"); }
        finally { setIsLoadingTx(false); }
    }, []);

    const handlePayment = async () => {
        if (!selected || payAmount <= 0) return;
        setIsPaying(true);
        try {
            const res = await authFetch(`/customer-ledger/customer/${selected.customer.id}/payment`, {
                method: "POST",
                body: { amount: payAmount, description: payNotes || undefined },
            });
            if (res.ok && res.data?.status) {
                toast.success(`Payment of Rs. ${fmt(payAmount)} recorded`);
                setShowPayment(false);
                setPayAmount(0); setPayNotes("");
                fetchAccounts();
                openAccount(selected);
            } else { toast.error(res.data?.message || "Payment failed"); }
        } catch { toast.error("Payment failed"); }
        finally { setIsPaying(false); }
    };

    const handleSetLimit = async () => {
        if (!selected) return;
        setIsSettingLimit(true);
        try {
            const res = await authFetch(`/customer-ledger/customer/${selected.customer.id}/credit-limit`, {
                method: "POST", body: { creditLimit: newLimit },
            });
            if (res.ok && res.data?.status) {
                toast.success("Credit limit updated");
                setShowCreditLimit(false);
                fetchAccounts();
                setSelected((prev: any) => ({ ...prev, creditLimit: newLimit }));
            } else { toast.error(res.data?.message || "Failed"); }
        } catch { toast.error("Failed to set limit"); }
        finally { setIsSettingLimit(false); }
    };

    const filtered = accounts.filter(k =>
        k.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        k.customer?.code?.toLowerCase().includes(search.toLowerCase()) ||
        k.customer?.contactNo?.includes(search)
    );

    return (
        <div className="flex flex-col gap-6 p-6 px-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <BookOpen className="h-7 w-7 text-primary" /> Customer Ledger
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Accounts Receivable — track customer credit balances and payment receipts</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 w-64" placeholder="Search by name, code, phone..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card px-5 py-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide mb-1">Total Customers</p>
                    <p className="text-2xl font-black">{accounts.length}</p>
                </div>
                <div className="rounded-xl border bg-destructive/5 border-destructive/20 px-5 py-4">
                    <p className="text-xs text-destructive uppercase font-bold tracking-wide mb-1">Total Outstanding</p>
                    <p className="text-2xl font-black text-destructive">
                        Rs. {fmt(accounts.filter(k => Number(k.balance) > 0).reduce((s, k) => s + Number(k.balance), 0))}
                    </p>
                </div>
                <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 px-5 py-4">
                    <p className="text-xs text-emerald-700 uppercase font-bold tracking-wide mb-1">Customers with Balance</p>
                    <p className="text-2xl font-black text-emerald-700">{accounts.filter(k => Number(k.balance) > 0).length}</p>
                </div>
            </div>

            {/* Credit accounts list */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="text-xs uppercase">Customer</TableHead>
                            <TableHead className="text-xs uppercase">Contact</TableHead>
                            <TableHead className="text-right text-xs uppercase">Credit Limit</TableHead>
                            <TableHead className="text-right text-xs uppercase text-destructive">Balance Due</TableHead>
                            <TableHead className="text-right text-xs uppercase">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...
                            </TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                No credit accounts found
                            </TableCell></TableRow>
                        ) : filtered.map(k => {
                            const bal = Number(k.balance);
                            const limit = Number(k.creditLimit);
                            const overLimit = limit > 0 && bal > limit;
                            return (
                                <TableRow key={k.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openAccount(k)}>
                                    <TableCell>
                                        <p className="font-semibold text-sm">{k.customer?.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{k.customer?.code}</p>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{k.customer?.contactNo || "—"}</TableCell>
                                    <TableCell className="text-right text-sm font-mono">
                                        {limit > 0 ? `Rs. ${fmt(limit)}` : <span className="text-muted-foreground">No limit</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn("font-bold font-mono text-sm", bal > 0 ? "text-destructive" : "text-emerald-600")}>
                                            {bal > 0 ? `Rs. ${fmt(bal)}` : "Settled"}
                                        </span>
                                        {overLimit && <Badge variant="destructive" className="ml-2 text-[10px] h-4">Over Limit</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {bal > 0 && (
                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                                onClick={e => { e.stopPropagation(); setSelected(k); setPayAmount(bal); setShowPayment(true); }}>
                                                <CheckCircle2 className="h-3 w-3" /> Receive Payment
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Account detail modal */}
            <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    {selected.customer?.name}
                                    <Badge variant="outline" className="font-mono text-xs">{selected.customer?.code}</Badge>
                                </DialogTitle>
                            </DialogHeader>

                            {/* Balance summary */}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className={cn("rounded-lg px-4 py-3 border", Number(selected.balance) > 0 ? "bg-destructive/5 border-destructive/20" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200")}>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Balance Due</p>
                                    <p className={cn("text-xl font-black", Number(selected.balance) > 0 ? "text-destructive" : "text-emerald-600")}>
                                        Rs. {fmt(Math.abs(Number(selected.balance)))}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{Number(selected.balance) > 0 ? "Customer owes" : Number(selected.balance) < 0 ? "Store owes" : "Settled"}</p>
                                </div>
                                <div className="rounded-lg px-4 py-3 border bg-muted/30">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Credit Limit</p>
                                    <p className="text-xl font-black">{Number(selected.creditLimit) > 0 ? `Rs. ${fmt(Number(selected.creditLimit))}` : "None"}</p>
                                    <button className="text-[10px] text-primary underline mt-0.5"
                                        onClick={() => { setNewLimit(Number(selected.creditLimit)); setShowCreditLimit(true); }}>
                                        Change limit
                                    </button>
                                </div>
                                <div className="rounded-lg px-4 py-3 border bg-muted/30">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Contact</p>
                                    <p className="text-sm font-semibold">{selected.customer?.contactNo || "—"}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{selected.customer?.address || ""}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Transaction history */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Transaction History</p>
                                <p className="text-xs text-muted-foreground">{txMeta?.total ?? 0} entries</p>
                            </div>

                            <ScrollArea className="flex-1 min-h-0">
                                {isLoadingTx ? (
                                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent bg-muted/20">
                                                <TableHead className="text-xs uppercase">Date</TableHead>
                                                <TableHead className="text-xs uppercase">Type</TableHead>
                                                <TableHead className="text-xs uppercase">Reference</TableHead>
                                                <TableHead className="text-right text-xs uppercase">Amount</TableHead>
                                                <TableHead className="text-right text-xs uppercase">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map(tx => {
                                                const meta = TX_META[tx.type] ?? { label: tx.type, icon: ArrowUpDown, cls: "text-muted-foreground" };
                                                const Icon = meta.icon;
                                                const amt = Number(tx.amount);
                                                return (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {new Date(tx.createdAt).toLocaleDateString()}<br />
                                                            <span className="text-[10px]">{new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={cn("flex items-center gap-1.5 text-xs font-semibold", meta.cls)}>
                                                                <Icon className="h-3.5 w-3.5" /> {meta.label}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs font-mono">{tx.referenceNumber || "—"}</p>
                                                            {tx.description && <p className="text-[10px] text-muted-foreground">{tx.description}</p>}
                                                        </TableCell>
                                                        <TableCell className={cn("text-right font-mono font-semibold text-sm", amt > 0 ? "text-destructive" : "text-emerald-600")}>
                                                            {amt > 0 ? `+Rs. ${fmt(amt)}` : `-Rs. ${fmt(Math.abs(amt))}`}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            Rs. {fmt(Number(tx.balanceAfter))}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </ScrollArea>

                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                                {Number(selected.balance) > 0 && (
                                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => { setPayAmount(Number(selected.balance)); setShowPayment(true); }}>
                                        <CheckCircle2 className="h-4 w-4" /> Record Payment
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment modal */}
            <Dialog open={showPayment} onOpenChange={setShowPayment}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Record Payment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                            <span className="text-muted-foreground">Outstanding Balance</span>
                            <span className="font-bold text-destructive">Rs. {fmt(Number(selected?.balance ?? 0))}</span>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Payment Amount</Label>
                            <Input type="number" min={0} className="font-mono"
                                value={payAmount || ""} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                            <Textarea rows={2} className="resize-none text-sm" placeholder="e.g. Cash received"
                                value={payNotes} onChange={e => setPayNotes(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handlePayment} disabled={isPaying || payAmount <= 0}>
                            {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Credit limit modal */}
            <Dialog open={showCreditLimit} onOpenChange={setShowCreditLimit}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Set Credit Limit</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>Set to 0 for no limit. Sales on credit account will be blocked if the balance exceeds this limit.</span>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Credit Limit (Rs.)</Label>
                            <Input type="number" min={0} className="font-mono"
                                value={newLimit || ""} placeholder="0 = no limit"
                                onChange={e => setNewLimit(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setShowCreditLimit(false)}>Cancel</Button>
                        <Button onClick={handleSetLimit} disabled={isSettingLimit}>
                            {isSettingLimit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Limit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
