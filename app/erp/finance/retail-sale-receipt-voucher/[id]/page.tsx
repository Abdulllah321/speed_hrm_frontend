import { getReceiptVouchers } from "@/lib/actions/receipt-voucher";
import { RetailSaleReceiptVoucherPrint } from "../components/retail-sale-receipt-voucher-print";
import { notFound } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

export default async function RetailSaleReceiptVoucherDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { data: vouchers } = await getReceiptVouchers("rs_rv");
    const voucher = vouchers?.find((v) => v.id === id);

    if (!voucher) {
        notFound();
    }

    return (
        <div className="flex-1 flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/erp/finance">Finance</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/erp/finance/retail-sale-receipt-voucher/list">
                                Retail Sale Receipt Voucher
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{voucher.rvNo}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </header>

            <div className="p-4 md:p-6 bg-gray-50 flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border">
                    <RetailSaleReceiptVoucherPrint voucher={voucher} />
                </div>
            </div>
        </div>
    );
}
