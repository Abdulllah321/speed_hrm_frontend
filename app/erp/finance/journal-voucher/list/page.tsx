import { getJournalVouchers } from "@/lib/actions/journal-voucher";
import { getChartOfAccounts } from "@/lib/actions/chart-of-account";
import { JournalVoucherList } from "../components/journal-voucher-list";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function JournalVoucherPage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string;
        fromDate?: string;
        toDate?: string;
        accountId?: string;
        search?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const rawFilters = await searchParams;
    const page = rawFilters.page ? parseInt(rawFilters.page, 10) : 1;
    const limit = rawFilters.limit ? parseInt(rawFilters.limit, 10) : 10;
    const filters = {
        ...rawFilters,
        page,
        limit,
    };

    const [result, { data: accounts }] = await Promise.all([
        getJournalVouchers(filters),
        getChartOfAccounts(),
    ]);

    const canCreate = await hasPermission("erp.finance.journal-voucher.create");
    const canRead = await hasPermission("erp.finance.journal-voucher.read");
    const canUpdate = await hasPermission("erp.finance.journal-voucher.update");
    const canDelete = await hasPermission("erp.finance.journal-voucher.delete");
    const canApprove = await hasPermission("erp.finance.journal-voucher.approve");

    return (
        <div className="flex-1 flex flex-col">
            <JournalVoucherList
                initialData={result.data || []}
                pagination={result.pagination}
                initialFilters={filters}
                accounts={accounts || []}
                permissions={{ canCreate, canRead, canUpdate, canDelete, canApprove }}
            />
        </div>
    );
}
