import React from "react";
import ExportCenterClient from "./export-center-client";
import { getFolders, getExports } from "@/lib/actions/exports-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExportCenterPage() {
  // Fetch initial folders and exports server-side (SSR) for fast rendering
  const foldersRes = await getFolders();
  const exportsRes = await getExports({ page: 1, limit: 10 });

  const folders = foldersRes.status ? foldersRes.data : [];
  const exportsList = exportsRes.status && exportsRes.data ? exportsRes.data : [];
  const exportsMeta = exportsRes.status && exportsRes.meta ? exportsRes.meta : {
    totalCount: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  return (
    <ExportCenterClient
      initialFolders={folders}
      initialExports={exportsList}
      initialMeta={exportsMeta}
    />
  );
}
