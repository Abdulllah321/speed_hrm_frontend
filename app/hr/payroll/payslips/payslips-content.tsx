"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPayslips, getPayslipDetail } from "@/lib/actions/payroll";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PayslipTemplate } from "./payslip-template";
import DataTable from "@/components/common/data-table";
import { getColumns, type PayslipRow } from "./columns";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import jsPDF from "jspdf";
import * as htmlToImage from 'html-to-image';
import { useRef } from "react";

interface PayslipsContentProps {
    departments: any[];
    subDepartments: any[];
    employees: any[];
}

export function PayslipsContent({ departments, subDepartments, employees }: PayslipsContentProps) {
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        monthYear: format(new Date(), "yyyy-MM"),
        departmentId: "all",
        subDepartmentId: "all",
        employeeId: "all",
    });

    const [viewingDetail, setViewingDetail] = useState<any>(null);
    const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const downloadRef = useRef<HTMLDivElement>(null);

    const filteredSubDepartments = useMemo(() => {
        if (filters.departmentId === "all") return subDepartments;
        return subDepartments.filter((sd) => sd.departmentId === filters.departmentId);
    }, [filters.departmentId, subDepartments]);

    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (filters.departmentId !== "all") {
            result = result.filter((e) => e.departmentId === filters.departmentId);
        }
        if (filters.subDepartmentId !== "all") {
            result = result.filter((e) => e.subDepartmentId === filters.subDepartmentId);
        }
        return result;
    }, [filters.departmentId, filters.subDepartmentId, employees]);

    const handleSearch = () => {
        startTransition(async () => {
            const [year, month] = filters.monthYear.split("-");
            const result = await getPayslips({
                month,
                year,
                departmentId: filters.departmentId,
                subDepartmentId: filters.subDepartmentId,
                employeeId: filters.employeeId,
            });

            if (result.status) {
                setData(result.data);
                if (result.data.length === 0) {
                    toast.info("No confirmed payroll records found for selected criteria.");
                }
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleView = async (detailId: string) => {
        setIsFetchingDetail(true);
        const result = await getPayslipDetail(detailId);
        setIsFetchingDetail(false);

        if (result.status) {
            setViewingDetail(result.data);
            setIsViewingModalOpen(true);
        } else {
            toast.error(result.message);
        }
    };

    const handleDownload = async (detailId: string) => {
        setIsDownloading(true);
        const toastId = toast.loading("Generating payslip PDF...");

        try {
            const result = await getPayslipDetail(detailId);
            if (!result.status) {
                toast.error(result.message, { id: toastId });
                return;
            }

            const detail = result.data;
            setViewingDetail(detail); // Reuse this state temporarily for rendering

            // Small delay to ensure React has updated the DOM in the hidden ref
            await new Promise(resolve => setTimeout(resolve, 500));

            if (downloadRef.current) {
                const dataUrl = await htmlToImage.toPng(downloadRef.current, {
                    backgroundColor: '#ffffff',
                    pixelRatio: 2,
                });

                const pdf = new jsPDF("p", "mm", "a4");
                const imgProps = pdf.getImageProperties(dataUrl);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`payslip-${detail.employee.employeeId}-${detail.payroll.month}-${detail.payroll.year}.pdf`);
                toast.success("Payslip downloaded successfully", { id: toastId });
            } else {
                toast.error("Failed to capture payslip content", { id: toastId });
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error("An error occurred while downloading the payslip", { id: toastId });
        } finally {
            setIsDownloading(false);
            if (!isViewingModalOpen) setViewingDetail(null);
        }
    };

    const columns = getColumns(handleView, handleDownload);

    const handlePrintIndividual = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <Card className="print:hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>View / Search Payslips</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Autocomplete
                                options={departments.map(d => ({ value: d.id, label: d.name }))}
                                value={filters.departmentId}
                                onValueChange={(value) => setFilters({ ...filters, departmentId: value || "all", subDepartmentId: "all", employeeId: "all" })}
                                placeholder="Select Department"
                                searchPlaceholder="Search department..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sub Department</Label>
                            <Autocomplete
                                options={filteredSubDepartments.map(sd => ({ value: sd.id, label: sd.name }))}
                                value={filters.subDepartmentId}
                                onValueChange={(value) => setFilters({ ...filters, subDepartmentId: value || "all", employeeId: "all" })}
                                disabled={filters.departmentId === "all"}
                                placeholder="Select Sub Department"
                                searchPlaceholder="Search sub department..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Autocomplete
                                options={filteredEmployees.map(e => ({ value: e.id, label: `(${e.employeeId}) ${e.employeeName}` }))}
                                value={filters.employeeId}
                                onValueChange={(value) => setFilters({ ...filters, employeeId: value || "all" })}
                                placeholder="Select Employee"
                                searchPlaceholder="Search employee..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Month-Year</Label>
                            <MonthYearPicker
                                value={filters.monthYear}
                                onChange={(val) => setFilters({ ...filters, monthYear: Array.isArray(val) ? val[0] : val })}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleSearch} disabled={isPending || isFetchingDetail} className="w-full md:w-auto">
                            {isPending || isFetchingDetail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="print:hidden px-4 py-4">
                <DataTable
                    columns={columns}
                    data={data}
                    searchFields={[
                        { key: "employee.employeeName", label: "Employee Name" },
                        { key: "employee.employeeId", label: "Employee ID" },
                    ]}
                    tableId="payslip-content"
                />
            </Card>

            {/* Viewing Modal */}
            <Dialog open={isViewingModalOpen} onOpenChange={setIsViewingModalOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="print:hidden">
                        <DialogTitle className="flex justify-between items-center pr-8">
                            <span>Employee Payslip Detail</span>
                            <Button size="sm" variant="outline" onClick={handlePrintIndividual}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Individual
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    {viewingDetail && <PayslipTemplate data={viewingDetail} />}
                </DialogContent>
            </Dialog>

            {/* Hidden container for PDF generation */}
            <div className="fixed -left-[9999px] top-0 overflow-hidden">
                <div ref={downloadRef} className="w-[800px] p-8 bg-white">
                    {viewingDetail && <PayslipTemplate data={viewingDetail} />}
                </div>
            </div>

            {/* Print styles for the modal content */}
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #radix-\:rq\:, #radix-\:rq\: * {
            visibility: visible;
          }
          #radix-\:rq\: {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .print\:hidden {
            display: none !important;
          }
          .DialogContent-root {
             max-height: none !important;
             overflow: visible !important;
          }
        }
      `}</style>
        </div>
    );
}
