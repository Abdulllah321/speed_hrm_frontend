import { LoanRequestList } from "./loan-request-list";
import { ListError } from "@/components/dashboard/list-error";
import { getLoanRequests } from "@/lib/actions/loan-request";
import type { LoanRequestRow } from "./columns";

export const dynamic = "force-dynamic";

const formatMonthYear = (monthYear?: string) => {
  if (!monthYear) return "—";
  const [year, month] = monthYear.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex] || month} / ${year}`;
};

export default async function ViewLoanRequestPage() {
  try {
    const result = await getLoanRequests();
    
    if (!result.status || !result.data) {
      return (
        <ListError
          title="Failed to load loan requests"
          message={result.message || "An unexpected error occurred. Please try again."}
        />
      );
    }

    // Transform API data to LoanRequestRow format
    const initialData: LoanRequestRow[] = result.data.map((loanRequest, index) => ({
      id: loanRequest.id,
      sNo: index + 1,
      empId: loanRequest.employee?.employeeId || loanRequest.employeeId || "—",
      empName: loanRequest.employee?.employeeName || "—",
      department: loanRequest.employee?.department?.name || "—",
      loanType: loanRequest.loanType?.name || "—",
      amount: typeof loanRequest.amount === 'string' ? parseFloat(loanRequest.amount) : loanRequest.amount,
      requestedDate: loanRequest.requestedDate ? new Date(loanRequest.requestedDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : "—",
      repaymentStartMonthYear: formatMonthYear(loanRequest.repaymentStartMonthYear),
      numberOfInstallments: loanRequest.numberOfInstallments || "—",
      approvalStatus: loanRequest.approvalStatus === 'approved' ? 'Approved' : 
                     loanRequest.approvalStatus === 'rejected' ? 'Rejected' : 'Pending',
      status: loanRequest.status === 'approved' ? 'Approved' :
              loanRequest.status === 'disbursed' ? 'Disbursed' :
              loanRequest.status === 'completed' ? 'Completed' :
              loanRequest.status === 'cancelled' ? 'Cancelled' :
              loanRequest.status === 'rejected' ? 'Rejected' : 'Pending',
    }));

    return <LoanRequestList initialData={initialData} />;
  } catch (error) {
    console.error("Error in ViewLoanRequestPage:", error);
    return (
      <ListError
        title="Failed to load loan requests"
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        }
      />
    );
  }
}
