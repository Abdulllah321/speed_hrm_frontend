import { getVendors } from "@/lib/actions/procurement";
import { VendorList } from "../components/vendor-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorListPage() {
    const { data: vendors } = await getVendors();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Vendors List</h2>
                <Button variant="outline" asChild>
                    <Link href="/erp/procurement/vendors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Vendor Form
                    </Link>
                </Button>
            </div>
            <div className="grid gap-8 grid-cols-1">
                <VendorList initialVendors={vendors || []} />
            </div>
        </div>
    );
}
