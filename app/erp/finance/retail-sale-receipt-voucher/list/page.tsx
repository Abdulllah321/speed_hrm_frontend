import { getRsrvVouchers } from "@/lib/actions/receipt-voucher";
import { getLocations } from "@/lib/actions/location";
import { getChartOfAccountsDropdown } from "@/lib/actions/chart-of-account";
import { RetailSaleReceiptVoucherList } from "../components/retail-sale-receipt-voucher-list";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RetailSaleReceiptVoucherListPage() {
    const [{ data: vouchers }, locationsRes, accountsRes] = await Promise.all([
        getRsrvVouchers().catch(() => ({ status: false, data: [] })),
        getLocations().catch(() => ({ status: false, data: [] })),
        getChartOfAccountsDropdown().catch(() => ({ status: false, data: [] })),
    ]);

    const canCreate = (await hasPermission("erp.finance.receipt-voucher.create").catch(() => true)) ?? true;
    const canRead = (await hasPermission("erp.finance.receipt-voucher.read").catch(() => true)) ?? true;
    const canUpdate = (await hasPermission("erp.finance.receipt-voucher.update").catch(() => true)) ?? true;
    const canDelete = (await hasPermission("erp.finance.receipt-voucher.delete").catch(() => true)) ?? true;
    const canApprove = (await hasPermission("erp.finance.receipt-voucher.approve").catch(() => true)) ?? true;

    return (
        <div className="flex-1 flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
                <div className="flex items-center gap-2 px-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/erp/finance">Finance</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/erp/finance/retail-sale-receipt-voucher/list">Retail Sale Receipt Voucher</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>List</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-[#F8F9FA] dark:bg-background">
                <RetailSaleReceiptVoucherList
                    initialData={vouchers || []}
                    locations={locationsRes?.data || []}
                    accounts={accountsRes?.data || []}
                    permissions={{ canCreate, canRead, canUpdate, canDelete, canApprove }}
                />
            </div>
        </div>
    );
}
