import { getJobTypes } from "@/lib/actions/job-type";
import { JobTypeList } from "./job-type-list";

export default async function JobTypeListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const { data: jobTypes } = await getJobTypes();

  return <JobTypeList initialJobTypes={jobTypes || []} newItemId={newItemId} />;
}
