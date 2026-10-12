"use client";

import { useState } from "react";
import { AlertTriangle, MapPin, UserRoundX, LogOut, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { logoutTerminalClient } from "@/lib/client-auth";
import { clearPosTerminalAction } from "@/lib/actions/pos";
import { navigateToPath } from "@/lib/navigation";
import { toast } from "sonner";

export function LocationGuard({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, logout } = useAuth();
    const [isLoggingOutTerminal, setIsLoggingOutTerminal] = useState(false);
    const [isSwitchingUser, setIsSwitchingUser] = useState(false);

    // If there is no user, or they don't have a terminal, allow other components to handle it
    if (!user || !user.terminalId) {
        return <>{children}</>;
    }

    // Admins can use POS anywhere
    if (isAdmin()) {
        return <>{children}</>;
    }

    const userLocationId = user.locationId;
    const terminalLocationId = user.terminal?.location?.id;

    // If they have no restricted location, or it matches the terminal, they are allowed
    if (!userLocationId || userLocationId === terminalLocationId) {
        return <>{children}</>;
    }

    const handleLogoutTerminalAndEnterLocation = async () => {
        setIsLoggingOutTerminal(true);
        try {
            // 1. Clear server-side remembered terminal cookie
            try {
                await clearPosTerminalAction();
            } catch (err) {
                console.error("Failed to clear remembered terminal action:", err);
            }

            // 2. Deregister terminal on backend & clear client cookies
            await logoutTerminalClient();

            // 3. Clear local storage POS artifacts
            try {
                localStorage.removeItem("pos_terminal");
                localStorage.removeItem("pos_session");
                sessionStorage.clear();
            } catch (e) {}

            toast.success("POS terminal logged out. Please enter your location code.");

            // 4. Redirect to pos-login so cashier can enter their location code
            navigateToPath("/auth/pos-login");
        } catch (error) {
            console.error("Terminal logout error:", error);
            navigateToPath("/auth/pos-login");
        }
    };

    const handleSwitchUser = async () => {
        setIsSwitchingUser(true);
        try {
            // Logout will clear the user's accessToken but preserve the terminal token.
            await logout();
        } finally {
            setIsSwitchingUser(false);
        }
    };

    const assignedLocationName =
        (user as any)?.employee?.location?.name ||
        (user as any)?.assignedLocation?.name ||
        (user as any)?.location?.name ||
        "Different from terminal";

    return (
        <div className="relative w-full h-full min-h-screen">
            {/* The actual page underneath, blurred out and non-interactive */}
            <div className="absolute inset-0 pointer-events-none blur-sm opacity-50 select-none overflow-hidden">
                {children}
            </div>

            {/* The rigid, un-closeable alert overlay */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
                <Card className="w-full max-w-lg shadow-2xl border-destructive/20 border-2">
                    <CardHeader className="text-center pb-4 space-y-3">
                        <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-destructive/20 shadow-inner">
                            <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-destructive">
                            Access Denied
                        </CardTitle>
                        <p className="text-base font-medium text-muted-foreground">
                            You do not have access to this location.
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Terminal Location</span>
                                    <span className="text-sm font-semibold truncate">{user.terminal?.location?.name || "Unknown"}</span>
                                </div>
                            </div>
                            <div className="h-px bg-border w-full" />
                            <div className="flex items-center gap-3">
                                <UserRoundX className="h-5 w-5 text-destructive shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Assigned Location</span>
                                    <span className="text-sm font-semibold text-destructive truncate">{assignedLocationName}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-center text-muted-foreground">
                            Please log out the terminal to enter your store&apos;s location code, or switch to an authorized user for this terminal.
                        </p>

                        <div className="space-y-3">
                            <Button
                                variant="default"
                                className="w-full h-12 font-bold text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md transition-all flex items-center justify-center gap-2"
                                onClick={handleLogoutTerminalAndEnterLocation}
                                disabled={isLoggingOutTerminal || isSwitchingUser}
                            >
                                {isLoggingOutTerminal ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        LOGGING OUT POS...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-4 w-4" />
                                        LOGOUT & ENTER YOUR OWN LOCATION
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-10 font-semibold text-xs border-muted-foreground/20 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                                onClick={handleSwitchUser}
                                disabled={isLoggingOutTerminal || isSwitchingUser}
                            >
                                {isSwitchingUser ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Switching user...
                                    </>
                                ) : (
                                    <>
                                        <Users className="h-3.5 w-3.5" />
                                        Switch Cashier (Keep Terminal Registered)
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
