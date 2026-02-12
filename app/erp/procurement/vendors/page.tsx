import { getVendors } from "@/lib/actions/procurement";
import { VendorForm } from "./components/vendor-form";
import { VendorList } from "./components/vendor-list";

export const dynamic = "force-dynamic";

export default async function VendorPage() {
    const { data: vendors } = await getVendors();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Vendors</h2>
            </div>
            <div className="grid gap-8 grid-cols-1">
                <VendorForm />
                <VendorList initialVendors={vendors || []} />
            </div>
        </div>
    );
}
