import { getPaymentVouchers } from "@/lib/actions/payment-voucher";
import { getChartOfAccounts } from "@/lib/actions/chart-of-account";
import { PaymentVoucherList } from "../components/payment-voucher-list";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PaymentVoucherListPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
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
    getPaymentVouchers(filters),
    getChartOfAccounts(),
  ]);

  const canCreate = await hasPermission("erp.finance.payment-voucher.create");
  const canRead = await hasPermission("erp.finance.payment-voucher.read");
  const canUpdate = await hasPermission("erp.finance.payment-voucher.update");
  const canDelete = await hasPermission("erp.finance.payment-voucher.delete");
  const canApprove = await hasPermission("erp.finance.payment-voucher.approve");

  return (
    <PaymentVoucherList
      initialData={result.data || []}
      pagination={result.pagination}
      initialFilters={filters}
      accounts={accounts || []}
      permissions={{ canCreate, canRead, canUpdate, canDelete, canApprove }}
    />
  );
}
