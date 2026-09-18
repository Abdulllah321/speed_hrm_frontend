import { WholesaleInvoiceView } from "@/components/reports/wholesale-invoice-register/wholesale-invoice-view";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Wholesale Invoice Register | Speed (Pvt.) Limited",
  description: "View and export wholesale invoice register report",
};

export default function WholesaleInvoiceRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <WholesaleInvoiceView />
    </Suspense>
  );
}
