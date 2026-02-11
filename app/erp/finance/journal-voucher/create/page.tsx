import { getChartOfAccounts } from "@/lib/actions/chart-of-account";
import { CreateJournalVoucherClient } from "./create-journal-voucher-client";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function CreateJournalVoucherPage() {
    const { data: accounts } = await getChartOfAccounts();

    return (
        <div className="flex-1 flex flex-col">
        
                <CreateJournalVoucherClient accounts={accounts || []} />
            </div>
      
    );
}
