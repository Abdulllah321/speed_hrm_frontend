import { getVouchers } from "@/lib/actions/vouchers";
import { VouchersListPage } from "./vouchers-list-page";

export default async function VouchersPage() {
    const res = await getVouchers({ page: 1, limit: 25 });
    return (
        <VouchersListPage 
            initialData={{
                vouchers: res.data ?? [],
                pagination: res.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 },
            }} 
        />
    );
}
