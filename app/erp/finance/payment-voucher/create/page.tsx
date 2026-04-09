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

  return <PaymentVoucherForm accounts={accounts || []} />;
}
