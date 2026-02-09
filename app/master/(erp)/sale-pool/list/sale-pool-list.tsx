"use client";

import { useRouter } from "next/navigation";
import DataTable from "@/components/common/data-table";
import { columns, SalePoolRow } from "./columns";
import { SalePool } from "@/lib/actions/sale-pool";

interface SalePoolListProps {
  initialSalePools: SalePool[];
}

export function SalePoolList({
  initialSalePools,
}: SalePoolListProps) {
  const router = useRouter();

  const handleAdd = () => {
    router.push("/erp/inventory-master/sale-pool/add");
  };

  const data: SalePoolRow[] = initialSalePools.map((pool) => ({
    ...pool,
    id: pool.id,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Sale Pools</h2>
      </div>

      <DataTable
        columns={columns}
        data={data}
        filterColumn="name"
        filterPlaceholder="Filter by name..."
        onAdd={handleAdd}
      />
    </div>
  );
}
