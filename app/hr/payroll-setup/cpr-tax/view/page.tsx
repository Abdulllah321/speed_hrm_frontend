import { CprList } from './cpr-list';
import { ListError } from '@/components/dashboard/list-error';
import { getCprTaxes } from '@/lib/actions/cpr-tax';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    months?: string;
    employeeIds?: string;
  }>;
}

export default async function ViewCprTaxPage({ searchParams }: PageProps) {
  try {
    const params = await searchParams;
    const result = await getCprTaxes({
      month: params.month,
      year: params.year,
      months: params.months,
      employeeIds: params.employeeIds,
    });
    const initialData = result.status && result.data ? result.data : [];

    return <CprList initialData={initialData} />;
  } catch (error) {
    console.error('Error in ViewCprTaxPage:', error);
    return (
      <ListError
        title="Failed to load CPR Tax records"
        message={
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.'
        }
      />
    );
  }
}
