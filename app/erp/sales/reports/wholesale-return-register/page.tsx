import { WholesaleReturnView } from "@/components/reports/wholesale-return-register/wholesale-return-view";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Wholesale Return Register | Speed (Pvt.) Limited",
  description: "View and export wholesale return register report",
};

export default function WholesaleReturnRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <WholesaleReturnView />
    </Suspense>
  );
}
