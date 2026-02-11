import { PosHeader } from "@/components/pos/pos-header";
import { PosSidebar } from "@/components/pos/pos-sidebar";
import { PaymentInterface } from "@/components/pos/payment-interface";

export default function PosPaymentPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <PosSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <PosHeader />
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-muted/20">
             <PaymentInterface />
        </main>
      </div>
    </div>
  );
}
