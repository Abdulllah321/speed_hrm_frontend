"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Printer, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { getBankReport } from "@/lib/actions/payroll";
import { Bank } from "@/lib/actions/bank";
import { format } from "date-fns";
import { Autocomplete } from "@/components/ui/autocomplete";
import * as XLSX from "xlsx";

import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { DatePicker } from "@/components/ui/date-picker";

interface BankReportContentProps {
    initialBanks: Bank[];
}

export function BankReportContent({ initialBanks }: BankReportContentProps) {
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        monthYear: format(new Date(), "yyyy-MM"),
        chequeDate: format(new Date(), "yyyy-MM-dd"),
        bankName: "all",
        branchAddress: "",
    });

    const bankOptions = useMemo(() => {
        return [
            { value: "all", label: "All Banks" },
            ...initialBanks.map(bank => ({ value: bank.name, label: bank.name }))
        ];
    }, [initialBanks]);

    const handleSearch = () => {
        startTransition(async () => {
            const [year, month] = filters.monthYear.split("-");
            const result = await getBankReport({
                month,
                year,
                bankName: filters.bankName === "all" ? "" : filters.bankName,
            });

            if (result.status) {
                setData(result.data);
                if (result.data.length === 0) {
                    toast.info("No records found for the selected criteria.");
                }
            } else {
                toast.error(result.message);
            }
        });
    };

    const totalAmount = useMemo(() => {
        return data.reduce((sum, item) => sum + (Number(item.netSalary) || 0), 0);
    }, [data]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        const exportData = data.map((item, index) => ({
            "S. NO.": index + 1,
            "EMP ID": item.employee?.employeeId || "N/A",
            "NAME": item.employee?.employeeName || "N/A",
            "BANK NAME": item.employee?.bankName || item.bankName || "N/A",
            "ACCOUNT NO": item.employee?.accountNumber || item.accountNumber || "N/A",
            "ACCOUNT TITLE": item.employee?.accountTitle || "N/A",
            "NET SALARY": Number(item.netSalary) || 0,
        }));

        // Add summary row
        exportData.push({
            "S. NO.": "",
            "EMP ID": "",
            "NAME": "TOTAL",
            "BANK NAME": "",
            "ACCOUNT NO": "",
            "ACCOUNT TITLE": "",
            "NET SALARY": totalAmount,
        } as any);

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Report");

        const fileName = `Bank_Report_${filters.bankName || "All"}_${filters.monthYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const handleExportCSV = () => {
        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = ["S.NO", "EMP ID", "NAME", "BANK NAME", "ACCOUNT NO.", "ACCOUNT TITLE", "NET SALARY"];
        const rows = data.map((item, index) => [
            index + 1,
            `"${item.employee?.employeeId || 'N/A'}"`,
            `"${item.employee?.employeeName || 'N/A'}"`,
            `"${item.employee?.bankName || item.bankName || 'N/A'}"`,
            `"${item.employee?.accountNumber || item.accountNumber || 'N/A'}"`,
            `"${item.employee?.accountTitle || 'N/A'}"`,
            item.netSalary,
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(",")),
            ["", "", "TOTAL:", "", "", "", totalAmount]
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bank_report_${filters.bankName || "All"}_${filters.monthYear}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formattedMonthYear = useMemo(() => {
        const [year, month] = filters.monthYear.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        return format(date, "MMMM yyyy");
    }, [filters.monthYear]);

    return (
        <div className="space-y-6">
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle>View Bank Report Form</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="min-w-[200px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Month-Year</label>
                            <MonthYearPicker
                                value={filters.monthYear}
                                onChange={(val) => setFilters({ ...filters, monthYear: Array.isArray(val) ? val[0] : val })}
                            />
                        </div>
                        <div className="min-w-[200px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Cheque Date</label>
                            <DatePicker
                                value={filters.chequeDate}
                                onChange={(val) => setFilters({ ...filters, chequeDate: val })}
                            />
                        </div>
                        <div className="min-w-[250px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Select Bank</label>
                            <Autocomplete
                                options={bankOptions}
                                value={filters.bankName}
                                onValueChange={(value) => setFilters({ ...filters, bankName: value || "" })}
                                placeholder="All Banks"
                                searchPlaceholder="Search bank..."
                            />
                        </div>
                        <div className="min-w-[250px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Branch Address</label>
                            <Input
                                value={filters.branchAddress}
                                onChange={(e) => setFilters({ ...filters, branchAddress: e.target.value })}
                                placeholder="Enter Branch Address"
                            />
                        </div>
                        <div className="flex gap-2 min-w-fit">
                            <Button onClick={handleSearch} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                            <Button variant="outline" onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300">
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportCSV}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="print:shadow-none print:border-none">
                <CardContent className="p-8 print:p-0">
                    <div className="max-w-6xl mx-auto space-y-8 text-sm">
                        {/* Header Info */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p>Date: {format(new Date(filters.chequeDate), "MMMM dd, yyyy")}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="font-bold text-base underline">The Manager</p>
                            <p className="font-bold">{filters.bankName && filters.bankName !== "all" ? filters.bankName : "[Bank Name]"}</p>
                            <p>{filters.branchAddress || "[Branch Address]"}</p>
                        </div>

                        <div className="text-center">
                            <p className="font-bold text-lg underline">Subject: Transfer Salary</p>
                        </div>

                        <div className="space-y-4">
                            <p>Dear Sir,</p>
                            <p>
                                You are authorized to transfer the salary for the Month of <strong>{formattedMonthYear}</strong> into the following accounts:
                            </p>
                        </div>

                        {/* Salary Table */}
                        <table className="w-full border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="border border-gray-300 px-3 py-2 text-left w-12">S. NO.</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">EMP ID</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">NAME</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">BANK NAME</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">ACCOUNT NO.</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">ACCOUNT TITLE</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">NET SALARY (RS.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-mono">{item.employee?.employeeId || "N/A"}</td>
                                        <td className="border border-gray-300 px-3 py-2 uppercase font-medium">{item.employee?.employeeName || "N/A"}</td>
                                        <td className="border border-gray-300 px-3 py-2">{item.employee?.bankName || item.bankName || "N/A"}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-mono">{item.employee?.accountNumber || item.accountNumber || "N/A"}</td>
                                        <td className="border border-gray-300 px-3 py-2">{item.employee?.accountTitle || "N/A"}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-medium">{Number(item.netSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-400">
                                            No records found. Select criteria and click Search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="font-bold">
                                <tr>
                                    <td colSpan={6} className="border border-gray-300 px-4 py-2 text-right">TOTAL:</td>
                                    <td className="border border-gray-300 px-4 py-2 text-right underline decoration-double">
                                        {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Signature Section */}
                        <div className="pt-24 flex justify-between">
                            <div className="w-64 border-t border-black text-center pt-2">
                                <p className="font-bold">Authorized Signatory</p>
                            </div>
                            <div className="w-64 border-t border-black text-center pt-2">
                                <p className="font-bold">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:shadow-none {
            box-shadow: none !important;
          }
          .print\:border-none {
            border: none !important;
          }
          .p-8.print\:p-0 {
            padding: 0 !important;
          }
          .max-w-4xl, .max-w-6xl {
            max-width: 100% !important;
          }
          .CardContent-root, .p-8 {
             padding: 0 !important;
          }
          .space-y-6 > :not(.print\:shadow-none) {
             display: none;
          }
          .print\:shadow-none, .print\:shadow-none * {
            visibility: visible;
          }
          .print\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
}
