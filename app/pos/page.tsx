import { PosHeader } from "@/components/pos/pos-header";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { ProductFilter } from "@/components/pos/product-filter";
import { PosSidebar } from "@/components/pos/pos-sidebar";

export default function PosPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <PosSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <PosHeader />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
             <ProductFilter />
             <ProductGrid />
          </main>
          <aside className="w-[400px] border-l bg-background shadow-xl z-20">
            <CartSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}
