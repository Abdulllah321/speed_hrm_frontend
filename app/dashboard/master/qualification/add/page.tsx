import { getInstitutes } from "@/lib/actions/institute";
import { QualificationAddForm } from "./qualification-add-form";
import { ListError } from "@/components/dashboard/list-error";

export const dynamic = "force-dynamic";

export default async function AddQualificationPage() {
  try {
    const institutesRes = await getInstitutes();

    if (!institutesRes.status || !institutesRes.data) {
      return (
        <ListError
          title="Failed to load institutes"
          message={institutesRes.message || "Unable to fetch institutes. Please check your connection and try again."}
        />
      );
    }

    return <QualificationAddForm institutes={institutesRes.data} />;
  } catch (error) {
    console.error("Error in AddQualificationPage:", error);
    return (
      <ListError
        title="Failed to load page"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
