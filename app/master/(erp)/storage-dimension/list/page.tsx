import { getStorageDimensions } from "@/lib/actions/storage-dimension";
import { StorageDimensionList } from "./storage-dimension-list";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function StorageDimensionListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getStorageDimensions();

    const data = result?.data || [];
    const status = result?.status ?? false;

    if (!status && !data.length) {
      return (
        <ListError
          title="Failed to load storage dimensions"
          message={result?.message || "Unable to fetch storage dimensions. Please check your connection and try again."}
        />
      );
    }

    return (
        <StorageDimensionList
          initialData={data}
          newItemId={newItemId}
        />
    );
  } catch (error) {
    console.error("Error in StorageDimensionListPage:", error);
    return (
      <ListError
        title="Failed to load storage dimensions"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
