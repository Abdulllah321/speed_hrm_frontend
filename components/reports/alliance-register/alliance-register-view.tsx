"use client";

import React, { useState, useEffect, useTransition } from "react";
import { AllianceRegisterRecord } from "./types";
import { AllianceRegisterHeader } from "./alliance-register-header";
import { AllianceRegisterFilters } from "./alliance-register-filters";
import { AllianceRegisterTable } from "./alliance-register-table";
import { useAllianceRegisterData } from "./use-alliance-register-data";
import { generateAllianceRegisterExcel } from "./excel-export";
import { generateAllianceRegisterPdf } from "./pdf-export";
import {
  getAllianceRegisterReport,
  queueAllianceRegisterReportExport,
  getAllianceRegisterReportExportStatus,
} from "@/lib/actions/pos-sales";
import { toast } from "sonner";
import { DateRange } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth } from "date-fns";

interface AllianceRegisterViewProps {
  initialReportData?: AllianceRegisterRecord[] | null;
  locations?: any[];
  cashiers?: any[];
  userId?: string;
}

export function AllianceRegisterView({
  initialReportData = [],
  locations = [],
  cashiers = [],
  userId = "system",
}: AllianceRegisterViewProps = {}) {
  const [records, setRecords] = useState<AllianceRegisterRecord[]>(
    initialReportData || []
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [isPending, startTransition] = useTransition();

  const activeSelectionNames = React.useMemo(() => {
    if (selectedLocationIds.length === 0) return "All Outlets";
    const selected = locations.filter((loc) => selectedLocationIds.includes(loc.id));
    return selected.map((loc) => loc.name).join(", ");
  }, [selectedLocationIds, locations]);

  const handleFetchReport = () => {
    startTransition(async () => {
      try {
        const startStr = dateRange.from ? dateRange.from.toISOString() : undefined;
        const endStr = dateRange.to ? dateRange.to.toISOString() : undefined;

        const res = await getAllianceRegisterReport({
          locationId: selectedLocationIds.join(","),
          cashierUserId: selectedCashierId,
          startDate: startStr,
          endDate: endStr,
        });

        if (res && res.status !== false && Array.isArray(res.data)) {
          setRecords(res.data);
          toast.success("Alliance Register report updated");
        } else {
          toast.error(res?.message || "Failed to load alliance register data");
        }
      } catch (err: any) {
        toast.error("Error fetching alliance register data");
      }
    });
  };

  useEffect(() => {
    handleFetchReport();
  }, [selectedLocationIds, selectedCashierId]);

  const {
    searchQuery,
    setSearchQuery,
    filteredRecords,
    grandTotals,
  } = useAllianceRegisterData(records);

  const handleExportExcel = async (type: "flat" | "hierarchical") => {
    if (filteredRecords.length === 0) {
      toast.error("No alliance register data available to export");
      return;
    }
    setIsExportingExcel(true);

    try {
      const { excelBuffer, fileName } = await generateAllianceRegisterExcel({
        exportType: type,
        records: filteredRecords,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel alliance register generated successfully");
    } catch (err: any) {
      toast.error("Failed to generate Excel export");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    if (filteredRecords.length === 0) {
      toast.error("No alliance register data available to print");
      return;
    }
    setIsExportingPdf(true);

    try {
      await generateAllianceRegisterPdf({
        records: filteredRecords,
        grandTotals,
        dateRange,
        locationNames: activeSelectionNames,
      });
    } catch (err: any) {
      toast.error("Failed to render PDF print view");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1750px] mx-auto">
      {/* Header section with KPIs */}
      <AllianceRegisterHeader totals={grandTotals} />

      {/* Filter bar */}
      <AllianceRegisterFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        locations={locations}
        cashiers={cashiers}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        selectedCashierId={selectedCashierId}
        onCashierChange={setSelectedCashierId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRefresh={handleFetchReport}
        isPending={isPending}
        previewJobId={null}
        sseState={{ status: "completed" }}
        isQueueingJob={false}
        isFetchingResult={false}
        onExportExcelFlat={() => handleExportExcel("flat")}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
      />

      {/* Virtualized Table */}
      <AllianceRegisterTable
        records={filteredRecords}
        grandTotals={grandTotals}
        searchQuery={searchQuery}
        isLoading={isPending}
      />
    </div>
  );
}
