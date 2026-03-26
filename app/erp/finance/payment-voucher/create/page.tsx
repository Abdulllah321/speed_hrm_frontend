import { getChartOfAccounts } from "@/lib/actions/chart-of-account";
import { PaymentVoucherForm } from "../components/payment-voucher-form";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function CreatePaymentVoucherPage() {
    const { data: accounts } = await getChartOfAccounts();

    return (
       
 
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-[#F8F9FA] dark:bg-background">
                <PaymentVoucherForm accounts={accounts || []} />
          
        </div>
    );
}
