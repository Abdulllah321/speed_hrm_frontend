import { Metadata } from "next";
import { ReconciliationContent } from "./reconciliation-content";

export const metadata: Metadata = {
    title: "Payroll Reconciliation Report | HRM",
    description: "Compare monthly payroll baseline, left employees, incoming employees, incentives, deductions, and net payable summaries.",
};

export default function PayrollReconciliationPage() {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <ReconciliationContent />
        </div>
    );
}
