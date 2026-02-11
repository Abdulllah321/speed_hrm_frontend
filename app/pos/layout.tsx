import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POS - SpeedHRM",
  description: "Point of Sale System",
};

export default function PosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-muted/40 font-sans">
      {children}
    </div>
  );
}
