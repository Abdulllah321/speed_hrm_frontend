"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Monitor, AlertCircle, MapPin, CheckCircle2, RotateCcw, Building2, Grid, ArrowLeft, Store } from "lucide-react";
import { posLoginClient, getPosContext } from "@/lib/client-auth";
import { getApiBaseUrl } from "@/lib/utils";
import { setPosTerminalAction, getPosTerminalAction, clearPosTerminalAction } from "@/lib/actions/pos";
import Image from "next/image";
import { buildSubdomainUrl } from "@/lib/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LoginStep = 'detect' | 'location-code' | 'terminal-select' | 'pin';

interface Terminal {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface LocationContext {
    location: {
        id: string;
        name: string;
        code: string;
    };
    terminals: Terminal[];
}

export default function PosLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<LoginStep>('detect');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Context Data
    const [context, setContext] = useState<LocationContext | null>(null);
    const [locationCode, setLocationCode] = useState("");

    // Terminal Selection
    const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

    // Auth Data
    const [pin, setPin] = useState("");
    const [rememberTerminal, setRememberTerminal] = useState(true);

    useEffect(() => {
        const handleKey = (e: any) => {
            if (step !== 'pin') return;
            if (/^[0-9]$/.test(e.key)) {
                setPin((prev) => (prev.length < 4 ? prev + e.key : prev));
            }
            if (e.key === "Backspace") {
                setPin((prev) => prev.slice(0, -1));
            }
        };

        window.addEventListener("keyup", handleKey);
        return () => window.removeEventListener("keyup", handleKey);
    }, [step]);

    useEffect(() => {
        if (pin.length === 4 && !isPending) {
            handlePinSubmit();
        }
    }, [pin, isPending]);

    useEffect(() => {
        // Check cookies for remembered terminal
        async function checkSavedTerminal() {
            const savedTerminal = await getPosTerminalAction();
            if (savedTerminal.code) {
                setSelectedTerminal({
                    code: savedTerminal.code,
                    name: savedTerminal.name || "Terminal",
                    id: "",
                    status: "active"
                });
                setStep('pin');
            } else {
                // Start auto-detection if no terminal remembered
                detectLocation();
            }
        }

        checkSavedTerminal();
    }, []);

    const detectLocation = () => {
        setError(null);
        if (!navigator.geolocation) {
            setStep('location-code');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                startTransition(async () => {
                    const result = await getPosContext(undefined, latitude, longitude);
                    if (result.status && result.data) {
                        setContext(result.data);
                        setStep('terminal-select');
                    } else {
                        // Fallback to manual code if auto-detect fails to find VALID location
                        setError(result.message || "Could not detect location. Please enter code.");
                        setStep('location-code');
                    }
                });
            },
            (err) => {
                console.warn("Geolocation denied/failed", err);
                setStep('location-code');
            }
        );
    };

    const handleVerifyLocationCode = () => {
        if (!locationCode) return;
        setError(null);
        startTransition(async () => {
            const result = await getPosContext(locationCode);
            if (result.status && result.data) {
                setContext(result.data);
                setStep('terminal-select');
            } else {
                setError(result.message || "Invalid Location Code");
            }
        });
    };

    const handleTerminalSelect = (terminal: Terminal) => {
        setSelectedTerminal(terminal);
        setStep('pin');
        setError(null);
        setPin("");
    };

    const handleBack = () => {
        if (step === 'pin') {
            // If we have a terminal selected (either from cookies or manual selection)
            // we decide whether to forget it or just go back to selection
            if (selectedTerminal) {
                // If it's a "remembered" terminal, forget it to go back
                // This matches the previous logic where localStorage signaled a "remembered" state
                handleForgetTerminal();
            } else {
                setStep('terminal-select');
            }
        } else if (step === 'terminal-select') {
            setStep('location-code');
            setContext(null);
        } else if (step === 'location-code') {
            setStep('detect');
            detectLocation(); // Retry?
        }
    };

    const handleForgetTerminal = async () => {
        await clearPosTerminalAction();
        setSelectedTerminal(null);
        setPin("");
        setError(null);
        setStep('location-code');
        setContext(null);
        detectLocation();
    };

    const handlePinSubmit = () => {
        if (!selectedTerminal || !pin || pin.length < 4) return;

        startTransition(async () => {
            try {
                const result = await posLoginClient(selectedTerminal.code, pin);
                if (result.status && result.data) {
                    toast.success("Login Successful");

                    if (rememberTerminal) {
                        await setPosTerminalAction(selectedTerminal.code, selectedTerminal.name);
                    }

                    // Redirect logic
                    const params = new URLSearchParams(window.location.search);
                    const callbackUrl = params.get("callbackUrl");
                    if (callbackUrl) {
                        router.push(buildSubdomainUrl("pos", callbackUrl));
                    } else {
                        router.push(buildSubdomainUrl("pos", "/pos/sales/new"));
                    }
                } else {
                    setError(result.message || "Login Failed");
                    setPin("");
                }
            } catch (err) {
                setError("An error occurred during login");
            }
        });
    };

    // Render Steps
    const renderDetecting = () => (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="bg-primary/10 p-4 rounded-full relative">
                    <MapPin className="h-8 w-8 text-primary animate-bounce" />
                </div>
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Detecting your location...</p>
        </div>
    );

    const renderLocationCode = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2 mb-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-primary mb-4 shadow-sm border border-primary/20">
                    <Store className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Enter Location Code</h3>
                <p className="text-sm text-muted-foreground">We couldn't detect your location automatically.</p>
            </div>

            <div className="space-y-2">
                <Label>Location Code</Label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="e.g. NYC-01"
                        value={locationCode}
                        onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                        className="pl-9 font-mono uppercase text-lg h-11 border-primary/20 focus-visible:ring-primary/30 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyLocationCode()}
                    />
                </div>
            </div>

            <Button className="w-full h-11 font-medium" onClick={handleVerifyLocationCode} disabled={isPending || !locationCode}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Verify Location
            </Button>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <Button variant="outline" className="w-full text-xs h-9" onClick={() => { setStep('detect'); detectLocation(); }}>
                <RotateCcw className="h-3 w-3 mr-1.5" /> Retry Auto-Detect
            </Button>
        </div>
    );

    const renderTerminalSelect = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between border-b pb-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2.5 rounded-xl border border-green-200 dark:border-green-800">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Current Location</p>
                        <h3 className="font-bold leading-tight text-lg">{context?.location.name}</h3>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('location-code')} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                    Change
                </Button>
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold ml-1">Available Terminals</Label>
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {context?.terminals.map((terminal) => (
                        <Button
                            key={terminal.id}
                            variant="outline"
                            className="h-20 flex flex-col items-center justify-center gap-1.5 hover:border-primary hover:bg-primary/5 hover:scale-[1.02] transition-all text-wrap border-2"
                            onClick={() => handleTerminalSelect(terminal)}
                        >
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                            <span className="font-bold text-sm leading-tight">{terminal.name}</span>
                        </Button>
                    ))}
                </div>
                {context?.terminals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/30">
                        No active terminals found.<br />Please contact admin.
                    </div>
                )}
            </div>
        </div>
    );

    const renderPinEntry = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-1 mb-2 bg-muted/30 p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Logging in to</p>
                <div className="flex items-center justify-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">{selectedTerminal?.name}</h3>
                </div>
            </div>

            <div className="flex justify-center mb-6">
                <div className="flex gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-3 w-3 rounded-full transition-all duration-300 transform",
                                pin.length > i ? "bg-primary scale-110 shadow-[0_0_10px_var(--color-primary)]" : "bg-muted-foreground/30 scale-90"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button
                        key={num}
                        variant="outline"
                        className="h-14 text-2xl font-medium border-muted-foreground/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                        onClick={() => {
                            if (pin.length < 4) {
                                setPin(pin + num);
                            }
                        }}
                    >
                        {num}
                    </Button>
                ))}
                <Button
                    variant="ghost"
                    className="h-14 text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => setPin("")}
                >
                    CLEAR
                </Button>
                <Button
                    variant="outline"
                    className="h-14 text-2xl font-medium border-muted-foreground/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                    onClick={() => {
                        if (pin.length < 6) setPin(pin + "0");
                    }}
                >
                    0
                </Button>
                <Button
                    variant="ghost"
                    className="h-14 hover:bg-muted transition-colors"
                    onClick={() => setPin(pin.slice(0, -1))}
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
            </div>

            <div className="space-y-4 mt-2">
                <div className="flex items-center space-x-2 justify-center py-2">
                    <Checkbox id="remember" checked={rememberTerminal} onCheckedChange={(c) => setRememberTerminal(!!c)} />
                    <Label htmlFor="remember" className="text-xs font-medium leading-none cursor-pointer">
                        Remember this terminal
                    </Label>
                </div>

                <Button
                    className="w-full h-12 text-md font-bold tracking-wide"
                    onClick={handlePinSubmit}
                    disabled={isPending || pin.length < 4}
                >
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    LOGIN
                </Button>

                <Button variant="link" size="sm" className="w-full text-xs text-muted-foreground h-auto p-0" onClick={handleBack}>
                    {selectedTerminal ? "Not your terminal? Forget it." : "Switch Terminal"}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-background to-secondary/20 flex items-center justify-center p-4 font-geist">
            {/* Background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-50" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] opacity-30" />
            </div>

            <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary backdrop-blur-sm bg-card/95">
                <CardHeader className="pb-2">
                    {step === 'location-code' || step === 'detect' ? (
                        <CardTitle className="text-2xl text-center font-bold">POS Access</CardTitle>
                    ) : null}
                    {step === 'terminal-select' && <CardTitle className="text-xl text-center">Select Terminal</CardTitle>}
                    {step === 'pin' && <CardTitle className="text-xl text-center">Authentication</CardTitle>}
                </CardHeader>
                <CardContent className="pt-2 min-h-[300px] flex flex-col justify-center">
                    {error && (
                        <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2 shadow-sm border-destructive/50 bg-destructive/10 text-destructive-foreground">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="font-medium">{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 'detect' && renderDetecting()}
                    {step === 'location-code' && renderLocationCode()}
                    {step === 'terminal-select' && renderTerminalSelect()}
                    {step === 'pin' && renderPinEntry()}

                </CardContent>
                <CardFooter className="justify-center border-t py-4 bg-muted/20">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-60">
                        <Monitor className="h-3 w-3" />
                        <span>Secure POS System • v2.5</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
