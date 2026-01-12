"use client";

import { useState } from "react";
import DataTable from "@/components/common/data-table";
import { columns } from "./columns";
import { PFReportItem } from "@/lib/actions/pf-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import { toast } from "sonner";

interface PFReportListProps {
    initialData: PFReportItem[];
}

export function PFReportList({ initialData }: PFReportListProps) {
    const [data] = useState<PFReportItem[]>(initialData);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = [
            "S.No",
            "Emp ID",
            "Name",
            "Department",
            "Designation",
            "Total PF",
            "PF Withdrawal",
            "PF Closing Amount"
        ];

        const rows = data.map((item, index) => [
            index + 1,
            item.employeeId,
            item.employeeName,
            item.department,
            item.designation,
            item.totalPFBalance,
            item.totalWithdrawal,
            item.closingBalance
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pf_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Report exported successfully");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">View Employee PF Report</h2>
                    <p className="text-muted-foreground">
                        Detailed report of Provident Fund balances and withdrawals
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="default" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="default" onClick={handleExportCSV} className="bg-orange-400 hover:bg-orange-500 text-white">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee PF Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable<PFReportItem>
                        columns={columns}
                        data={data}
                        searchFields={[
                            { key: "employeeDetails", label: "Employee" },
                        ]}
                        tableId="pf-report-list"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
