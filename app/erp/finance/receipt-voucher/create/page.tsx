import { getChartOfAccounts } from "@/lib/actions/chart-of-account";
import { ReceiptVoucherForm } from "../components/receipt-voucher-form";

export default async function CreateReceiptVoucherPage() {
    const { data: accounts } = await getChartOfAccounts();

    return <ReceiptVoucherForm accounts={accounts || []} />;
}
