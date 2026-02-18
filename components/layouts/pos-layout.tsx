"use client";

import { useEffect, useState } from "react";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { PosSidebar } from "@/components/pos/pos-sidebar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Clock, MapPin, Monitor } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { navigateToPath } from "@/lib/navigation";

interface PosLayoutProps {
    children: React.ReactNode;
}

export function PosLayout({ children }: PosLayoutProps) {
    const { user, loading } = useAuth();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Session Protection
    useEffect(() => {
        if (!loading && !user) {
            navigateToPath("/pos-login");
        }
    }, [user, loading]);

    if (!user) return null;

    const terminalCode = (user as any)?.terminal?.code || (user as any)?.terminalId || "T-000";
    const locationCode = (user as any)?.terminal?.location?.code || (user as any)?.locationId || "L-000";

    return (
        <SidebarProvider className="flex-1">
            <PosSidebar />
            <SidebarInset>
                <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 sm:px-6 sticky z-40 w-full justify-between shadow-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <SidebarTrigger className="shrink-0" />

                        {/* Terminal Context Info */}
                        <div className="hidden md:flex items-center gap-6 ml-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 transition-colors hover:bg-muted font-medium">
                                <MapPin className="h-4 w-4 text-primary" />
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Location Code</span>
                                    <span className="text-sm font-bold text-foreground mt-0.5">{locationCode}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 transition-colors hover:bg-muted font-medium">
                                <Monitor className="h-4 w-4 text-primary" />
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Terminal Code</span>
                                    <span className="text-sm font-bold text-foreground mt-0.5">{terminalCode}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Context Info (Simplified) */}
                        <div className="md:hidden flex items-center gap-2 text-xs font-bold text-muted-foreground">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{locationCode}</span>
                            <span>/</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{terminalCode}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <ThemeToggle />

                        {/* Real-time Clock - Matching requested alignment */}
                        <div className="flex items-center gap-3 px-3 py-1 border-l border-border/50 pl-4 h-10">
                            <div className="p-2 rounded-full bg-primary/5 text-primary shrink-0">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col justify-center min-w-[140px]">
                                <div className="text-[13px] font-bold text-foreground leading-tight tracking-tight whitespace-nowrap">
                                    {format(time, "EEE, MMM dd, yyyy")}
                                </div>
                                <div className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5 uppercase tracking-wide">
                                    {format(time, "hh:mm:ss a")}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
