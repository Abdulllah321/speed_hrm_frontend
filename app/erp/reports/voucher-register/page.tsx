import React from "react";
import { VoucherRegisterView } from "@/components/reports/voucher-register/voucher-register-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voucher Register Platform | ERP Reports",
  description: "Master ledger and liability register for Gift, Corporate, Credit, Exchange & Refund Vouchers with Outstanding Vouchers Preview.",
};

export default function VoucherRegisterPage() {
  return <VoucherRegisterView />;
}
