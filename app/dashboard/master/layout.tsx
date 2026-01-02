import type { Metadata } from "next";
import { MasterTitleUpdater } from "./title-updater";

export const metadata: Metadata = {
  title: "Master Data Management | HR Management System",
  description: "Manage master data including departments, designations, branches, qualifications, and other organizational settings",
};

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MasterTitleUpdater />
      {children}
    </>
  );
}
