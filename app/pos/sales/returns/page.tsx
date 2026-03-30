"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw, ArrowLeft, Minus, Plus, ArrowLeftRight, Banknote, ShoppingCart, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";

function fmt(val: number) {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface OrderItem {
    id: string; itemId: string; description: string; sku: string;
    unitPrice: number; quantity: number; returnQty: number; lineTotal: number;
}

interface NewItem {
    itemId: string; description: string; sku: string;
    unitPrice: number; quantity: number; lineTotal: number;
}

// ─── Shared order search ──────────────────────────────────────────────────────
function OrderSearch({ onFound }: { onFound: (order: any, items: OrderItem[]) => void }) {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!search.trim()) return;
        setLoading(true);
        try {
            const res = await authFetch(`/pos-sales/orders?search=${encodeURIComponent(search.trim())}&limit=1`);
            const found = res.data?.data?.[0];
            if (!found) { toast.error("Order not found"); return; }
            if (found.status === "voided") { toast.error("Order already voided"); return; }
            const items: OrderItem[] = found.items.map((i: any) => ({
                id: i.id, itemId: i.itemId,
                description: i.item?.description || i.itemId,
                sku: i.item?.sku || "",
                unitPrice: Number(i.unitPrice),
                quantity: i.quantity,
                returnQty: 0, lineTotal: 0,
            }));
            onFound(found, items);
        } catch { toast.error("Search failed"); }
        finally { setLoading(false); }
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Enter Order # (e.g. SO-20260330-0001)"
                            value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSearch()} />
                    </div>
                    <Button onClick={handleSearch} disabled={loading || !search.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Order"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Order summary card ───────────────────────────────────────────────────────
function OrderCard({ order }: { order: any }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShoppingCart className="h-4 w-4" /> {order.orderNumber}
                    </CardTitle>
                    <Badge variant="secondary" className="capitalize">{order.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()} · Grand Total:
                    <span className="font-bold text-foreground ml-1">Rs. {fmt(Number(order.grandTotal))}</span>
                </p>
            </CardHeader>
        </Card>
    );
}

// ─── Qty stepper ─────────────────────────────────────────────────────────────
function QtyCell({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center justify-center gap-1.5">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>
                <Minus className="h-3 w-3" />
            </Button>
            <Input type="number" min={0} max={max} value={value}
                onChange={e => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
                className="w-14 h-7 text-center text-sm p-1" />
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.min(max, value + 1))} disabled={value === max}>
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}

// ─── RETURN TAB ───────────────────────────────────────────────────────────────
function ReturnTab({ order, items, setItems, onDone }: {
    order: any; items: OrderItem[]; setItems: (fn: (p: OrderItem[]) => OrderItem[]) => void; onDone: () => void;
}) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const updateQty = (idx: number, val: number) =>
        setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, returnQty: val, lineTotal: val * it.unitPrice }));

    const total = items.reduce((s, i) => s + i.lineTotal, 0);
    const hasAny = items.some(i => i.returnQty > 0);

    const submit = async () => {
        setConfirm(false); setSubmitting(true);
        try {
            const payload = { items: items.filter(i => i.returnQty > 0).map(i => ({ orderItemId: i.id, itemId: i.itemId, quantity: i.returnQty })), reason };
            const res = await authFetch(`/pos-sales/orders/${order.id}/return`, { method: "POST", body: JSON.stringify(payload) });
            if (res.data?.status) { toast.success("Return processed, stock restored"); onDone(); }
            else toast.error(res.data?.message || "Return failed");
        } catch { toast.error("Return failed"); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-center">Ordered</TableHead>
                                <TableHead className="text-center w-44">Return Qty</TableHead>
                                <TableHead className="text-right">Refund</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => (
                                <TableRow key={item.id} className={cn(item.returnQty > 0 && "bg-red-50/40 dark:bg-red-950/20")}>
                                    <TableCell><p className="font-semibold text-sm">{item.description}</p><p className="text-xs text-muted-foreground font-mono">{item.sku}</p></TableCell>
                                    <TableCell className="text-right font-mono text-sm">Rs. {fmt(item.unitPrice)}</TableCell>
                                    <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                    <TableCell><QtyCell value={item.returnQty} max={item.quantity} onChange={v => updateQty(idx, v)} /></TableCell>
                                    <TableCell className={cn("text-right font-bold font-mono text-sm", item.returnQty > 0 ? "text-red-600" : "text-muted-foreground")}>
                                        {item.returnQty > 0 ? `Rs. ${fmt(item.lineTotal)}` : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reason</CardTitle></CardHeader>
                    <CardContent><Input placeholder="e.g. Defective, wrong size..." value={reason} onChange={e => setReason(e.target.value)} /></CardContent>
                </Card>
                <Card className={cn("border-2", hasAny ? "border-red-400/60" : "border-border")}>
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items selected</span><span className="font-bold">{items.filter(i => i.returnQty > 0).length}</span></div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg"><span>Refund Amount</span><span className="text-red-600">Rs. {fmt(total)}</span></div>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white gap-2" disabled={!hasAny || submitting} onClick={() => setConfirm(true)}>
                            <RotateCcw className="h-4 w-4" />{submitting ? "Processing..." : "Process Return"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Confirm Return</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">Return items from <span className="font-mono font-bold text-primary">{order.orderNumber}</span>. Stock will be restored.</p>
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                            {items.filter(i => i.returnQty > 0).map(i => (
                                <div key={i.id} className="flex justify-between text-sm"><span>{i.description} × {i.returnQty}</span><span className="font-mono font-bold text-red-600">Rs. {fmt(i.lineTotal)}</span></div>
                            ))}
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2"><span>Total Refund</span><span className="text-red-600">Rs. {fmt(total)}</span></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submit}>Confirm Return</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── EXCHANGE TAB ─────────────────────────────────────────────────────────────
function ExchangeTab({ order, items, setItems, onDone }: {
    order: any; items: OrderItem[]; setItems: (fn: (p: OrderItem[]) => OrderItem[]) => void; onDone: () => void;
}) {
    const [reason, setReason] = useState("");
    const [newItems, setNewItems] = useState<NewItem[]>([]);
    const [itemSearch, setItemSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const updateReturnQty = (idx: number, val: number) =>
        setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, returnQty: val, lineTotal: val * it.unitPrice }));

    const searchNewItem = async () => {
        if (!itemSearch.trim()) return;
        setSearching(true);
        try {
            const res = await authFetch(`/pos-sales/lookup?q=${encodeURIComponent(itemSearch.trim())}`);
            setSearchResults(res.data?.data || []);
        } catch { toast.error("Item search failed"); }
        finally { setSearching(false); }
    };

    const addNewItem = (item: any) => {
        const exists = newItems.find(i => i.itemId === item.id);
        if (exists) { toast.info("Item already added"); return; }
        setNewItems(prev => [...prev, { itemId: item.id, description: item.description, sku: item.sku, unitPrice: item.unitPrice, quantity: 1, lineTotal: item.unitPrice }]);
        setSearchResults([]); setItemSearch("");
    };

    const updateNewQty = (idx: number, val: number) =>
        setNewItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, quantity: val, lineTotal: val * it.unitPrice }));

    const removeNew = (idx: number) => setNewItems(prev => prev.filter((_, i) => i !== idx));

    const returnedValue = items.reduce((s, i) => s + i.lineTotal, 0);
    const newValue = newItems.reduce((s, i) => s + i.lineTotal, 0);
    const difference = newValue - returnedValue;
    const hasReturn = items.some(i => i.returnQty > 0);
    const hasNew = newItems.length > 0;

    const submit = async () => {
        setConfirm(false); setSubmitting(true);
        try {
            const payload = {
                returnedItems: items.filter(i => i.returnQty > 0).map(i => ({ orderItemId: i.id, itemId: i.itemId, quantity: i.returnQty })),
                newItems: newItems.map(i => ({ itemId: i.itemId, quantity: i.quantity, unitPrice: i.unitPrice })),
                reason,
            };
            const res = await authFetch(`/pos-sales/orders/${order.id}/exchange`, { method: "POST", body: JSON.stringify(payload) });
            if (res.data?.status) { toast.success("Exchange processed successfully"); onDone(); }
            else toast.error(res.data?.message || "Exchange failed");
        } catch { toast.error("Exchange failed"); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Return side */}
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">← Items Being Returned</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Item</TableHead><TableHead className="text-center">Ordered</TableHead><TableHead className="text-center w-36">Return Qty</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={item.id} className={cn(item.returnQty > 0 && "bg-red-50/40 dark:bg-red-950/20")}>
                                        <TableCell><p className="font-semibold text-sm">{item.description}</p><p className="text-xs text-muted-foreground font-mono">{item.sku}</p></TableCell>
                                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                        <TableCell><QtyCell value={item.returnQty} max={item.quantity} onChange={v => updateReturnQty(idx, v)} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* New items side */}
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">→ New Items to Issue</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2">
                            <Input placeholder="Search item by SKU / name..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchNewItem()} className="flex-1" />
                            <Button size="sm" variant="outline" onClick={searchNewItem} disabled={searching}>{searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}</Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                {searchResults.map((r: any) => (
                                    <div key={r.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm" onClick={() => addNewItem(r)}>
                                        <div><p className="font-medium">{r.description}</p><p className="text-xs text-muted-foreground font-mono">{r.sku}</p></div>
                                        <span className="font-mono font-bold">Rs. {fmt(r.unitPrice)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {newItems.length > 0 && (
                            <Table>
                                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-center w-32">Qty</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
                                <TableBody>
                                    {newItems.map((item, idx) => (
                                        <TableRow key={idx} className="bg-green-50/40 dark:bg-green-950/20">
                                            <TableCell><p className="font-semibold text-sm">{item.description}</p><p className="text-xs text-muted-foreground font-mono">{item.sku}</p></TableCell>
                                            <TableCell><QtyCell value={item.quantity} max={99} onChange={v => updateNewQty(idx, v)} /></TableCell>
                                            <TableCell className="text-right font-mono font-bold text-green-600 text-sm">Rs. {fmt(item.lineTotal)}</TableCell>
                                            <TableCell><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeNew(idx)}>×</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reason</CardTitle></CardHeader>
                    <CardContent><Input placeholder="e.g. Wrong size, customer preference..." value={reason} onChange={e => setReason(e.target.value)} /></CardContent>
                </Card>
                <Card className={cn("border-2", (hasReturn && hasNew) ? "border-blue-400/60" : "border-border")}>
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Returned value</span><span className="font-mono text-red-600">- Rs. {fmt(returnedValue)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">New items value</span><span className="font-mono text-green-600">+ Rs. {fmt(newValue)}</span></div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>{difference >= 0 ? "Customer Pays" : "Refund"}</span>
                            <span className={difference >= 0 ? "text-green-600" : "text-red-600"}>Rs. {fmt(Math.abs(difference))}</span>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={!hasReturn || !hasNew || submitting} onClick={() => setConfirm(true)}>
                            <ArrowLeftRight className="h-4 w-4" />{submitting ? "Processing..." : "Process Exchange"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Confirm Exchange</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">Exchange for order <span className="font-mono font-bold text-primary">{order.orderNumber}</span></p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-lg p-3 space-y-1">
                                <p className="text-xs font-bold text-red-600 uppercase mb-2">Returning</p>
                                {items.filter(i => i.returnQty > 0).map(i => <div key={i.id} className="flex justify-between text-xs"><span>{i.description} ×{i.returnQty}</span><span className="font-mono">Rs. {fmt(i.lineTotal)}</span></div>)}
                            </div>
                            <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-3 space-y-1">
                                <p className="text-xs font-bold text-green-600 uppercase mb-2">Issuing</p>
                                {newItems.map((i, idx) => <div key={idx} className="flex justify-between text-xs"><span>{i.description} ×{i.quantity}</span><span className="font-mono">Rs. {fmt(i.lineTotal)}</span></div>)}
                            </div>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2">
                            <span>{difference >= 0 ? "Customer Pays" : "Refund"}</span>
                            <span className={difference >= 0 ? "text-green-600" : "text-red-600"}>Rs. {fmt(Math.abs(difference))}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={submit}>Confirm Exchange</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── REFUND TAB ───────────────────────────────────────────────────────────────
function RefundTab({ order, onDone }: { order: any; onDone: () => void }) {
    const [refundAmount, setRefundAmount] = useState(Number(order.grandTotal));
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const submit = async () => {
        setConfirm(false); setSubmitting(true);
        try {
            const res = await authFetch(`/pos-sales/orders/${order.id}/refund`, {
                method: "POST",
                body: JSON.stringify({ refundAmount, reason }),
            });
            if (res.data?.status) { toast.success(`Refund of Rs. ${fmt(refundAmount)} processed`); onDone(); }
            else toast.error(res.data?.message || "Refund failed");
        } catch { toast.error("Refund failed"); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4 max-w-lg">
            <Card>
                <CardHeader><CardTitle className="text-sm">Refund Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Refund Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">Rs.</span>
                            <Input type="number" min={1} max={Number(order.grandTotal)} value={refundAmount}
                                onChange={e => setRefundAmount(Math.min(Number(order.grandTotal), Math.max(0, parseFloat(e.target.value) || 0)))}
                                className="pl-10 font-mono text-lg font-bold" />
                        </div>
                        <p className="text-xs text-muted-foreground">Max refundable: Rs. {fmt(Number(order.grandTotal))}</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
                        <Input placeholder="e.g. Price dispute, service issue, duplicate charge..." value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                        ⚠ Refund only — no stock movement. Items remain sold.
                    </div>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        disabled={!refundAmount || !reason.trim() || submitting} onClick={() => setConfirm(true)}>
                        <Banknote className="h-4 w-4" />{submitting ? "Processing..." : "Process Refund"}
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Confirm Refund</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">Refund for order <span className="font-mono font-bold text-primary">{order.orderNumber}</span>. No stock will be restored.</p>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between font-bold text-lg"><span>Refund Amount</span><span className="text-amber-600">Rs. {fmt(refundAmount)}</span></div>
                            <p className="text-xs text-muted-foreground italic">Reason: {reason}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={submit}>Confirm Refund</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SalesReturnPage() {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [items, setItems] = useState<OrderItem[]>([]);

    const handleFound = (foundOrder: any, foundItems: OrderItem[]) => {
        setOrder(foundOrder);
        setItems(foundItems);
    };

    const handleReset = () => { setOrder(null); setItems([]); };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-6 px-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sales Return / Exchange / Refund</h1>
                        <p className="text-slate-400 text-sm">Search an order then choose the type of transaction.</p>
                    </div>
                </div>
                {order && <Button variant="outline" size="sm" onClick={handleReset}>Search Another Order</Button>}
            </div>

            <div className="flex-1 p-6 px-10 overflow-auto space-y-4">
                <OrderSearch onFound={handleFound} />

                {order && (
                    <>
                        <OrderCard order={order} />
                        <Tabs defaultValue="return">
                            <TabsList className="grid w-full grid-cols-3 max-w-md">
                                <TabsTrigger value="return" className="gap-2"><RotateCcw className="h-3.5 w-3.5" />Return</TabsTrigger>
                                <TabsTrigger value="exchange" className="gap-2"><ArrowLeftRight className="h-3.5 w-3.5" />Exchange</TabsTrigger>
                                <TabsTrigger value="refund" className="gap-2"><Banknote className="h-3.5 w-3.5" />Refund</TabsTrigger>
                            </TabsList>
                            <TabsContent value="return" className="mt-4">
                                <ReturnTab order={order} items={items} setItems={setItems} onDone={() => router.push("/pos/sales/history")} />
                            </TabsContent>
                            <TabsContent value="exchange" className="mt-4">
                                <ExchangeTab order={order} items={items} setItems={setItems} onDone={() => router.push("/pos/sales/history")} />
                            </TabsContent>
                            <TabsContent value="refund" className="mt-4">
                                <RefundTab order={order} onDone={() => router.push("/pos/sales/history")} />
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </div>
    );
}
