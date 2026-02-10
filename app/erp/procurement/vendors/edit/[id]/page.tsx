import { getVendor } from "@/lib/actions/procurement";
import { VendorForm } from "../../components/vendor-form";
import { notFound } from "next/navigation";

export default async function EditVendorPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { data: vendor } = await getVendor(id);

    if (!vendor) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Vendor</h2>
            </div>
            <div className="grid gap-4 grid-cols-1">
                <VendorForm initialData={vendor} id={id} />
            </div>
        </div>
    );
}
