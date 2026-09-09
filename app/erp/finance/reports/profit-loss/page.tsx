import { getIncomeStatement } from "@/lib/actions/finance-reports";
import { getChartOfAccountsTree } from "@/lib/actions/chart-of-account";
import { ProfitLossClient } from "./profit-loss-client";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

export default async function ProfitLossPage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const to   = now.toISOString().split("T")[0];
  const [result, coaRes] = await Promise.all([
    getIncomeStatement(from, to),
    getChartOfAccountsTree(),
  ]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/erp/finance">Finance</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Reports</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Profit &amp; Loss</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProfitLossClient
          initialData={result.data}
          defaultFrom={from}
          defaultTo={to}
          accounts={coaRes.data ?? []}
        />
      </div>
    </>
  );
}
