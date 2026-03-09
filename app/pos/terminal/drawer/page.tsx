"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Wallet, Calculator, LogOut, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

async function apiFetch<T>(endpoint: string, options?: any): Promise<T> {
    const companyId = getCookie("companyId");
    const companyCode = getCookie("companyCode");
    const response = await axios({
        url: `${API_BASE}${endpoint}`,
        method: options?.method || "GET",
        params: options?.params,
        data: options?.body,
        headers: {
            "Content-Type": "application/json",
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(companyCode ? { "x-tenant-id": companyCode } : {}),
        },
        withCredentials: true,
    });
    return response.data;
}

function fmtCurrency(val: number) {
    return val.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DrawerManagementPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [sessionData, setSessionData] = useState<any>(null);

    // Modals
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    // Form State
    const [floatAmount, setFloatAmount] = useState<number | "">("");
    const [floatNote, setFloatNote] = useState("");
    const [actualCash, setActualCash] = useState<number | "">("");
    const [closeNote, setCloseNote] = useState("");
    const [closeSummary, setCloseSummary] = useState<any>(null);

    const fetchSession = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch<any>("/pos-session/current");
            // The backend returns the object directly, nestjs default or custom payload?
            // Assuming the backend returns { session, metrics, isDrawerOpen }
            setSessionData(res || null);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                setSessionData(null);
            } else {
                toast.error("Failed to load drawer status");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();
    }, []);

    const handleOpenDrawer = async () => {
        if (floatAmount === "" || Number(floatAmount) < 0) {
            toast.error("Please enter a valid opening float amount");
            return;
        }
        try {
            await apiFetch("/pos-session/current/open", {
                method: "PUT",
                body: { amount: Number(floatAmount), note: floatNote },
            });
            toast.success("Cash drawer opened successfully");
            setShowOpenModal(false);
            fetchSession();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to open drawer");
        }
    };

    const handleCloseDrawer = async () => {
        if (actualCash === "" || Number(actualCash) < 0) {
            toast.error("Please enter the counted cash amount");
            return;
        }
        try {
            const res = await apiFetch<any>("/pos-session/current/close", {
                method: "POST",
                body: { actualCash: Number(actualCash), note: closeNote },
            });
            toast.success("Cash drawer closed successfully");
            setCloseSummary({
                expected: sessionData.metrics.expectedCash,
                actual: Number(actualCash),
                variance: res.variance,
            });
            setShowCloseModal(false);
            setShowSummaryModal(true);
            fetchSession();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to close drawer");
        }
    };

    const handleGoToPos = () => {
        router.push("/pos/new-sale");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <p className="text-muted-foreground text-lg">Loading Drawer Status...</p>
            </div>
        );
    }

    const isDrawerOpen = sessionData?.isDrawerOpen;
    const metrics = sessionData?.metrics || {};

    return (
        <div className="min-h-screen font-inter">
            {/* HEADER */}
            <div className="max-w-4xl mx-auto pt-6 px-4 mb-6">
                <div className="bg-card text-card-foreground rounded-[32px] p-4 flex items-center justify-between shadow-sm border border-border">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleGoToPos}
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                Cash Drawer Management
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your terminal's cash float and sales collected.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn("px-4 py-2 rounded-full font-medium text-sm border", isDrawerOpen ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                            Status: {isDrawerOpen ? "Drawer Open" : "Drawer Closed"}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-card text-card-foreground rounded-[32px] p-8 shadow-sm border border-border">
                    {!sessionData ? (
                        <div className="text-center py-12">
                            <Wallet className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold mb-2">No Active POS Session</h2>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                You must be logged into a POS terminal to manage a cash drawer. Please login via the POS PIN screen.
                            </p>
                            <Button onClick={() => router.push("/pos/login")} size="lg" className="rounded-full px-8">
                                Go to Terminal Login
                            </Button>
                        </div>
                    ) : !isDrawerOpen ? (
                        <div className="text-center py-12">
                            <Wallet className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold mb-2">Drawer is Closed</h2>
                            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                Open the cash drawer by entering the starting float amount. You cannot process cash sales until the drawer is opened.
                            </p>
                            <Button
                                onClick={() => {
                                    setFloatAmount("");
                                    setFloatNote("");
                                    setShowOpenModal(true);
                                }}
                                size="lg"
                                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                            >
                                Open Cash Drawer
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-primary" />
                                Current Drawer Metrics
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Opening Float</p>
                                    <p className="text-3xl font-bold">Rs. {fmtCurrency(metrics.openingFloat || 0)}</p>
                                </div>

                                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Cash Sales Collected</p>
                                    <p className="text-3xl font-bold">Rs. {fmtCurrency(metrics.cashSales || 0)}</p>
                                    <p className="text-xs text-muted-foreground/60 mt-2">Net cash from orders processed today</p>
                                </div>

                                <div className="bg-primary/10 rounded-2xl p-6 border border-primary/20">
                                    <p className="text-sm font-medium text-primary mb-1">Expected Cash In Drawer</p>
                                    <p className="text-3xl font-black text-primary">Rs. {fmtCurrency(metrics.expectedCash || 0)}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-6 border-t border-border">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleGoToPos}
                                    className="rounded-full px-8 text-muted-foreground"
                                >
                                    Continue Selling
                                </Button>
                                <Button
                                    onClick={() => {
                                        setActualCash("");
                                        setCloseNote("");
                                        setShowCloseModal(true);
                                    }}
                                    size="lg"
                                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                                >
                                    Close Drawer
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* OPEN DRAWER MODAL */}
            <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Open Cash Drawer</DialogTitle>
                        <DialogDescription>
                            Enter the starting float amount currently in the drawer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="float">Opening Float Amount (Rs.)</Label>
                            <Input
                                id="float"
                                type="number"
                                min="0"
                                value={floatAmount}
                                onChange={(e) => setFloatAmount(e.target.value ? Number(e.target.value) : "")}
                                className="rounded-xl h-12 text-lg px-4 bg-muted/30 border-transparent focus-visible:ring-primary focus-visible:bg-background"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Textarea
                                id="note"
                                value={floatNote}
                                onChange={(e) => setFloatNote(e.target.value)}
                                className="rounded-xl bg-muted/30 border-transparent focus-visible:ring-primary focus-visible:bg-background resize-none"
                                placeholder="E.g., Morning shift float"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowOpenModal(false)} className="rounded-full">
                            Cancel
                        </Button>
                        <Button onClick={handleOpenDrawer} className="rounded-full bg-primary hover:bg-primary/90 px-8">
                            Open Drawer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CLOSE DRAWER MODAL */}
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Close Cash Drawer</DialogTitle>
                        <DialogDescription>
                            Count the cash in the drawer and enter the actual amount.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-muted/50 p-4 rounded-xl border border-border flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">Expected Cash</span>
                            <span className="text-lg font-bold">Rs. {fmtCurrency(metrics.expectedCash || 0)}</span>
                        </div>

                        <div className="space-y-2 mt-2">
                            <Label htmlFor="actual">Actual Counted Cash (Rs.)</Label>
                            <Input
                                id="actual"
                                type="number"
                                min="0"
                                value={actualCash}
                                onChange={(e) => setActualCash(e.target.value ? Number(e.target.value) : "")}
                                className="rounded-xl h-12 text-lg px-4 bg-destructive/5 border-destructive/20 focus-visible:ring-destructive focus-visible:bg-background"
                                placeholder="Enter counted amount..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnote">Closing Note (Optional)</Label>
                            <Textarea
                                id="cnote"
                                value={closeNote}
                                onChange={(e) => setCloseNote(e.target.value)}
                                className="rounded-xl bg-muted/30 border-transparent focus-visible:ring-primary focus-visible:bg-background resize-none"
                                placeholder="Reason for any variance or general note"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCloseModal(false)} className="rounded-full">
                            Cancel
                        </Button>
                        <Button onClick={handleCloseDrawer} className="rounded-full bg-slate-800 hover:bg-slate-900 px-8 text-white">
                            Confirm & Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SUMMARY MODAL (Post-Close) */}
            <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
                <DialogContent className="sm:max-w-[400px] rounded-3xl" showCloseButton={false}>
                    <div className="pt-6 pb-2 text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-1">Drawer Closed</h2>
                        <p className="text-muted-foreground mb-6">Your session has been securely closed.</p>

                        <div className="bg-muted/50 rounded-2xl p-4 text-left space-y-3 mb-6 border border-border">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Expected Cash</span>
                                <span className="font-medium">Rs. {fmtCurrency(closeSummary?.expected || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Actual Cash</span>
                                <span className="font-medium">Rs. {fmtCurrency(closeSummary?.actual || 0)}</span>
                            </div>
                            <div className="pt-3 flex justify-between items-center border-t border-border">
                                <span className="font-semibold">Variance</span>
                                <span className={cn("font-bold", closeSummary?.variance < 0 ? "text-destructive" : closeSummary?.variance > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                                    {closeSummary?.variance > 0 ? "+" : ""}
                                    Rs. {fmtCurrency(closeSummary?.variance || 0)}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                setShowSummaryModal(false);
                                router.push("/pos/login"); // Redirect to login as session is closed
                            }}
                            className="w-full rounded-full h-12 text-base"
                        >
                            Back to Terminal Login
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
