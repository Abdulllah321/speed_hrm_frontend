import React from "react";
import ImportHistoryClient from "./import-history-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ImportHistoryPage() {
  return <ImportHistoryClient />;
}
