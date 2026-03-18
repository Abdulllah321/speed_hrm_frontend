import HRLayoutClient from "./layout-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HRLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <HRLayoutClient>{children}</HRLayoutClient>;
}
