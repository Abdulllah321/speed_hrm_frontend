"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Printer, Download, Plus } from "lucide-react";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { JournalVoucher } from "@/lib/actions/journal-voucher";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import Link from "next/link";
import { voucherStore } from "@/lib/voucher-store";
import DataTable from "@/components/common/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function JournalVoucherList({
    initialData,
    accounts
}: {
    initialData: JournalVoucher[],
    accounts: ChartOfAccount[]
}) {
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [selectedAccount, setSelectedAccount] = useState<string>("");
    const [status, setStatus] = useState<string>("all");
    const [vouchers, setVouchers] = useState<JournalVoucher[]>(initialData);
    const [showFilterInfo, setShowFilterInfo] = useState(false);

    // Merge client-side session state with server-side initial data
    useEffect(() => {
        const localJVs = voucherStore.getJournalVouchers();
        const combined = [...localJVs, ...initialData];
        const unique = combined.filter((v, index, self) =>
            index === self.findIndex((t) => t.id === v.id)
        );

        setVouchers(unique.sort((a, b) => new Date(b.jvDate).getTime() - new Date(a.jvDate).getTime()));
    }, [initialData]);

    const columns = useMemo<ColumnDef<JournalVoucher>[]>(() => [
        {
            accessorKey: "jvNo",
            header: "J.V. No.",
            cell: ({ row }) => <span className="font-semibold">{row.original.jvNo}</span>
        },
        {
            accessorKey: "jvDate",
            header: "J.V. Date",
            cell: ({ row }) => format(new Date(row.original.jvDate), "dd-MMM-yyyy")
        },
        {
            id: "details",
            header: "Debit/Credit",
            cell: ({ row }) => (
                <div className="space-y-1 min-w-[300px]">
                    {row.original.details.map((detail, idx) => (
                        <div key={idx} className="flex justify-between gap-4 items-center">
                            <span className="flex-1">
                                <span className="font-bold mr-2 text-gray-700">{detail.debit > 0 ? "Dr =" : "Cr ="}</span>
                                <span className="uppercase text-gray-600 truncate max-w-[200px] inline-block">{detail.accountName || "Account"}</span>
                            </span>
                            <span className="font-bold text-gray-800">
                                {(detail.debit || detail.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
            )
        },
        {
            accessorKey: "status",
            header: "Voucher Status",
            cell: ({ row }) => (
                <span className={cn(
                    "font-bold",
                    row.original.status === 'approved' ? "text-green-600" : "text-yellow-600"
                )}>
                    {row.original.status === 'approved' ? "Approved" : "Pending"}
                </span>
            )
        }
    ], []);

    // Filter logic for DataTable data
    const filteredVouchers = useMemo(() => {
        return vouchers.filter(jv => {
            const date = new Date(jv.jvDate);
            const matchesDate = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
            const matchesAccount = !selectedAccount || jv.details.some(d => d.accountId === selectedAccount);
            const matchesStatus = status === "all" || jv.status === status;
            return matchesDate && matchesAccount && matchesStatus;
        });
    }, [vouchers, fromDate, toDate, selectedAccount, status]);

    return (
        <div className="space-y-6">
            {/* Header with Page Title and Action Buttons */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Journal Vouchers</h2>
                    <p className="text-muted-foreground">View and manage journal vouchers</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/finance/journal-voucher/create">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Voucher
                        </Button>
                    </Link>
                    <Button variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export (xlsx)
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="border-b">
                    <CardTitle>View Journal Voucher List</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-lg border">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Select Date Range</Label>
                            <DateRangePicker
                                initialDateFrom={fromDate}
                                initialDateTo={toDate}
                                onUpdate={(values) => {
                                    setFromDate(values.range.from);
                                    setToDate(values.range.to);
                                }}
                                align="start"
                                locale="en-GB"
                                showCompare={false}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Account Head</Label>
                            <Autocomplete
                                options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                                value={selectedAccount}
                                onValueChange={setSelectedAccount}
                                placeholder="Select Account"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Voucher Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Button
                                className="w-full h-10 font-bold"
                                onClick={() => setShowFilterInfo(true)}
                            >
                                View Range Wise Data Filter
                            </Button>
                        </div>
                    </div>

                    {showFilterInfo && fromDate && toDate && (
                        <div className="text-sm font-bold italic text-slate-800 py-2 border-b">
                            Journal Voucher List From :
                            <span className="text-red-600 ml-1 font-mono">{format(fromDate, "dd-MM-yyyy")}</span>
                            <span className="mx-1">Between To</span>
                            <span className="text-red-600 font-mono">{format(toDate, "dd-MM-yyyy")}</span>
                        </div>
                    )}

                    <DataTable
                        columns={columns}
                        data={filteredVouchers}
                        searchFields={[{ key: "jvNo", label: "JV Number" }]}
                        tableId="journal-voucher-list"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
