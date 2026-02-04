import { getMachines } from "@/lib/actions/machine";
import { MachineList } from "./machine-list";
import { ListError } from "@/components/dashboard/list-error";
import { PermissionGuard } from "@/components/auth/permission-guard";

export const dynamic = "force-dynamic";

export default async function MachineListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  try {
    const { newItemId } = await searchParams;
    const result = await getMachines();

    const data = result?.data || [];
    const status = result?.status ?? false;

    if (!status && !data.length) {
      return (
        <ListError
          title="Failed to load machines"
          message={result?.message || "Unable to fetch machines. Please check your connection and try again."}
        />
      );
    }

    return (
      // <PermissionGuard permissions="machine.read">
        <MachineList
          initialMachines={data}
          newItemId={newItemId}
        />
      // </PermissionGuard>
    );
  } catch (error) {
    console.error("Error in MachineListPage:", error);
    return (
      <ListError
        title="Failed to load machines"
        message={error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
      />
    );
  }
}
