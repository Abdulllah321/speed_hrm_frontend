import { useMemo, useState } from "react";
import { AllianceRegisterRecord, AllianceRegisterTotals } from "./types";

function createEmptyTotals(): AllianceRegisterTotals {
  return {
    count: 0,
    retailPrice: 0,
    retailWost: 0,
    discount: 0,
    sTax: 0,
    netSale: 0,
    cash: 0,
    card: 0,
    giftVoucherAmt: 0,
    creditAmt: 0,
    claimAmt: 0,
    corporateAmt: 0,
    exchangeAmt: 0,
    creditVoucherIssuedAmt: 0,
  };
}

export function useAllianceRegisterData(records: AllianceRegisterRecord[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cashierFilter, setCashierFilter] = useState("all");

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;

    return records.filter((r) => {
      return (
        r.invoiceNo.toLowerCase().includes(q) ||
        r.allianceOption.toLowerCase().includes(q) ||
        r.prefixCardNo.toLowerCase().includes(q) ||
        r.authId.toLowerCase().includes(q) ||
        r.cardNo.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery]);

  const grandTotals = useMemo<AllianceRegisterTotals>(() => {
    const totals = createEmptyTotals();

    for (const row of filteredRecords) {
      totals.count++;
      totals.retailPrice += Number(row.retailPrice || 0);
      totals.retailWost += Number(row.retailWost || 0);
      totals.discount += Number(row.discount || 0);
      totals.sTax += Number(row.sTax || 0);
      totals.netSale += Number(row.netSale || 0);
      totals.cash += Number(row.cash || 0);
      totals.card += Number(row.card || 0);
      totals.giftVoucherAmt += Number(row.giftVoucherAmt || 0);
      totals.creditAmt += Number(row.creditAmt || 0);
      totals.claimAmt += Number(row.claimAmt || 0);
      totals.corporateAmt += Number(row.corporateAmt || 0);
      totals.exchangeAmt += Number(row.exchangeAmt || 0);
      totals.creditVoucherIssuedAmt += Number(row.creditVoucherIssuedAmt || 0);
    }

    return totals;
  }, [filteredRecords]);

  return {
    searchQuery,
    setSearchQuery,
    cashierFilter,
    setCashierFilter,
    filteredRecords,
    grandTotals,
  };
}
