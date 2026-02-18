"use client";

import { PosLayout } from "@/components/layouts/pos-layout";

export default function PosRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PosLayout>{children}</PosLayout>;
}
