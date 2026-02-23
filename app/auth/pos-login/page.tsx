"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Monitor, AlertCircle, MapPin, CheckCircle2, RotateCcw, Building2, Grid, ArrowLeft, Store, ChevronRight, Plus } from "lucide-react";
import { posLoginClient, getPosContext, getAvailableProfilesClient, switchPosSessionClient } from "@/lib/client-auth";
import { getApiBaseUrl } from "@/lib/utils";
import Image from "next/image";
import { buildSubdomainUrl } from "@/lib/navigation";
import { toast } from "sonner";
import { loginPosUser } from "@/lib/client-auth";
import { setPosTerminalAction, getPosTerminalAction, clearPosTerminalAction } from "@/lib/actions/pos";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useEnvironment } from "@/components/providers/environment-provider";

type LoginStep = 'detect' | 'location-code' | 'terminal-select' | 'pin' | 'user-login' | 'account-select';

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
    const { environment, setEnvironment } = useEnvironment();
    const { refreshUser } = useAuth();
    const [step, setStep] = useState<LoginStep>('detect');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const submittingRef = useRef(false); // guard against concurrent PIN submits

    // Context Data
    const [context, setContext] = useState<LocationContext | null>(null);
    const [locationCode, setLocationCode] = useState("");

    // Terminal Selection
    const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

    // Auth Data
    const [pin, setPin] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberTerminal, setRememberTerminal] = useState(true);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeProfile, setActiveProfile] = useState<any | null>(null);

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
        // Only trigger when pin first reaches 4 digits.
        // Intentionally exclude isPending from deps — we rely on submittingRef
        // to guard against concurrent calls. Having isPending here caused the
        // effect to re-fire every time the transition finished while pin was still 4.
        if (pin.length === 4) {
            handlePinSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin]);

    useEffect(() => {
        // Check cookies for remembered terminal
        async function checkSavedTerminal() {
            const savedTerminal = await getPosTerminalAction();
            if (savedTerminal && savedTerminal.code) {
                setSelectedTerminal({
                    code: savedTerminal.code,
                    name: savedTerminal.name || "Terminal",
                    id: "",
                    status: "active"
                });
                setStep('pin');
                return;
            }
            // Start auto-detection if no terminal remembered
            detectLocation();
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
        if (step === 'user-login') {
            setStep('pin');
            setPin("");
        } else if (step === 'pin') {
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

    const handleForgetTerminal = () => {
        startTransition(async () => {
            await clearPosTerminalAction();
            setSelectedTerminal(null);
            setPin("");
            setError(null);
            setStep('location-code');
            setContext(null);
            detectLocation();
        });
    };

    const handlePinSubmit = () => {
        if (!selectedTerminal || !pin || pin.length < 4) return;
        if (submittingRef.current) return; // already in-flight, ignore
        submittingRef.current = true;
        setPin(""); // clear immediately so the effect can't re-fire

        startTransition(async () => {
            try {
                const result = await posLoginClient(selectedTerminal.code, pin);
                if (result.status && result.data) {

                    if (rememberTerminal) {
                        await setPosTerminalAction({
                            code: selectedTerminal.code,
                            name: selectedTerminal.name
                        });
                    } else {
                        await clearPosTerminalAction();
                    }

                    // ✅ Backend auto-linked an existing HR session — result.data.user exists.
                    // Navigate directly without any extra steps.
                    if (result.data?.user) {
                        toast.success(`Welcome back, ${result.data.user.firstName || 'User'}`);
                        await refreshUser();
                        const params = new URLSearchParams(window.location.search);
                        const callbackUrl = params.get("callbackUrl");
                        window.location.href = buildSubdomainUrl("pos", callbackUrl || "/pos/sales/new");
                        return;
                    }

                    // Terminal-only token was set. Check for previously known profiles.
                    if (result.errorType === 'NO_POS_ACCESS') {
                        toast.error(result.message || "Current user lacks POS access. Please select an authorized account.");
                    } else {
                        toast.success("Terminal Authenticated");
                    }

                    const availableProfiles = await getAvailableProfilesClient();
                    setProfiles(availableProfiles);

                    if (availableProfiles.length > 0) {
                        const active = availableProfiles.find(p => p.isActive);
                        if (active) setActiveProfile(active);
                        setStep('account-select');
                    } else {
                        setStep('user-login');
                    }
                    setError(null);
                } else {
                    setError(result.message || "Terminal Login Failed");
                }
            } catch (err) {
                setError("An error occurred during terminal login");
            } finally {
                submittingRef.current = false;
            }
        });
    };

    const handleSelectProfile = (profile: any) => {
        if (profile.isActive) {
            // Active HR session — use switch-session to create a linked POS token
            startTransition(async () => {
                try {
                    const result = await switchPosSessionClient();
                    if (result.status) {
                        toast.success(`Welcome back, ${profile.firstName}`);
                        await refreshUser();
                        const params = new URLSearchParams(window.location.search);
                        const callbackUrl = params.get("callbackUrl");
                        window.location.href = buildSubdomainUrl("pos", callbackUrl || "/pos/sales/new");
                    } else {
                        // switch-session failed — pre-fill email and let user type password
                        setEmail(profile.email);
                        setStep('user-login');
                        setError(result.message || "Auto-login failed. Please login manually.");
                    }
                } catch (err) {
                    setError("Communication error with server.");
                    setEmail(profile.email);
                    setStep('user-login');
                }
            });
        } else {
            // Known browser profile but not currently active — pre-fill email
            setEmail(profile.email);
            setStep('user-login');
        }
    };

    const handleUserLoginSubmit = () => {
        if (!email || !password) {
            setError("Please enter both email and password");
            return;
        }

        startTransition(async () => {
            try {
                const result = await loginPosUser(email, password);

                if (result.status) {
                    toast.success(`Welcome, ${result.data?.user?.firstName || 'User'}`);
                    await refreshUser();

                    // Redirect logic
                    const params = new URLSearchParams(window.location.search);
                    const callbackUrl = params.get("callbackUrl");
                    if (callbackUrl) {
                        window.location.href = buildSubdomainUrl("pos", callbackUrl);
                    } else {
                        window.location.href = buildSubdomainUrl("pos", "/pos/sales/new");
                    }
                } else {
                    setError(result.message || "Login Failed");
                }
            } catch (err) {
                setError("An error occurred during user login");
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
                {isPending && (
                    <div className="flex items-center justify-center gap-2 text-primary animate-in fade-in duration-200">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Authenticating...</span>
                    </div>
                )}

                {!isPending && pin.length < 4 && (
                    <p className="text-center text-xs text-muted-foreground">
                        Enter your 4-digit PIN to unlock
                    </p>
                )}

                <div className="flex items-center space-x-2 justify-center py-2">
                    <Checkbox id="remember" checked={rememberTerminal} onCheckedChange={(c) => setRememberTerminal(!!c)} />
                    <Label htmlFor="remember" className="text-xs font-medium leading-none cursor-pointer">
                        Remember this terminal
                    </Label>
                </div>

                <Button variant="link" size="sm" className="w-full text-xs text-muted-foreground h-auto p-0" onClick={handleBack}>
                    {selectedTerminal ? "Not your terminal? Forget it." : "Switch Terminal"}
                </Button>
            </div>
        </div>
    );

    const renderAccountSelect = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-1 bg-muted/30 p-3 rounded-lg border">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Terminal Authenticated</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-lg font-bold">{selectedTerminal?.name}</h3>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold ml-1">Choose Account</Label>
                <div className="divide-y border rounded-xl overflow-hidden bg-card">
                    {profiles.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => handleSelectProfile(profile)}
                            className="w-full flex items-center gap-4 p-4 text-left hover:bg-primary/5 transition-all group"
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 group-hover:scale-110 transition-transform">
                                {profile.firstName?.[0]}{profile.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                                    {profile.firstName} {profile.lastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {profile.email}
                                </p>
                            </div>
                            {profile.isActive && (
                                <Badge variant="secondary" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20">
                                    Active
                                </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                    <button
                        onClick={() => setStep('user-login')}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-primary/5 transition-all group bg-muted/20"
                    >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-dashed group-hover:scale-110 transition-transform">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-muted-foreground group-hover:text-primary transition-colors">
                                Use another account
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>

            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleBack}>
                <ArrowLeft className="h-3 w-3 mr-2" />
                Back to Terminal Lock
            </Button>
        </div>
    );

    const renderUserLogin = () => {
        // Find the profile we are trying to log into to show their avatar if available
        const targetProfile = profiles.find(p => p.email === email);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-1 mb-6 bg-muted/30 p-3 rounded-lg border">
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Terminal Authenticated</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-bold">{selectedTerminal?.name}</h3>
                    </div>
                </div>

                <div className="space-y-4">
                    {targetProfile ? (
                        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm mb-2">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 text-lg">
                                {targetProfile.firstName?.[0] || email[0].toUpperCase()}{targetProfile.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-base truncate leading-tight">
                                    {targetProfile.firstName} {targetProfile.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {targetProfile.email}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                placeholder="user@example.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUserLoginSubmit()}
                            autoFocus
                        />
                    </div>

                    <Button
                        className="w-full h-11 font-bold mt-2"
                        onClick={handleUserLoginSubmit}
                        disabled={isPending || !email || !password}
                    >
                        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        LOGIN to POS
                    </Button>

                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleBack}>
                        <ArrowLeft className="h-3 w-3 mr-2" />
                        Back to Terminal Lock
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Card className="shadow-2xl backdrop-blur-sm bg-card/95">
            <CardHeader className="pb-2">
                {step === 'location-code' || step === 'detect' ? (
                    <CardTitle className="text-2xl text-center font-bold tracking-tight">POS Access</CardTitle>
                ) : null}
                {step === 'terminal-select' && <CardTitle className="text-2xl text-center font-bold tracking-tight">Select Terminal</CardTitle>}
                {step === 'pin' && <CardTitle className="text-2xl text-center font-bold tracking-tight">Unlock Terminal</CardTitle>}
                {step === 'account-select' && <CardTitle className="text-2xl text-center font-bold tracking-tight">Access Terminal</CardTitle>}
                {step === 'user-login' && <CardTitle className="text-2xl text-center font-bold tracking-tight">User Login</CardTitle>}
            </CardHeader>
            <CardContent className="pt-2 min-h-[300px] flex flex-col justify-center">
                {error && (
                    <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2 shadow-sm border-destructive/50 bg-destructive/10 text-destructive-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-medium text-sm">{error}</AlertDescription>
                    </Alert>
                )}

                {step === 'detect' && renderDetecting()}
                {step === 'location-code' && renderLocationCode()}
                {step === 'terminal-select' && renderTerminalSelect()}
                {step === 'pin' && renderPinEntry()}
                {step === 'account-select' && renderAccountSelect()}
                {step === 'user-login' && renderUserLogin()}

            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-6">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                    <Monitor className="h-3 w-3" />
                    <span>Secure POS System • v2.5</span>
                </div>

                <div className="w-full pt-4 mt-2 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                            Powered by
                        </p>
                        <div className="flex items-center gap-1.5 opacity-80">
                            <Image
                                src="/logo.png"
                                alt="Innovative Network Logo"
                                width={18}
                                height={18}
                                className="object-contain"
                            />
                            <span className="text-xs font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                Innovative Network Pvt Ltd
                            </span>
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
