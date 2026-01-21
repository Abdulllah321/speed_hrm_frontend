"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, AlertCircle, EyeOff, Eye } from "lucide-react";
import { loginClient } from "@/lib/client-auth";
import Image from "next/image";

// Helper to build subdomain URL
function buildSubdomainUrl(subdomain: string, path: string, port?: string): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isDevelopment = hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("localtest.me");
  
  if (isDevelopment) {
    let baseDomain = "localhost";
    if (hostname.includes("localtest.me")) {
      baseDomain = "localtest.me";
    }
    const portStr = port || window.location.port || "3001";
    return `${protocol}//${subdomain}.${baseDomain}:${portStr}${path}`;
  } else {
    // Extract base domain (e.g., "example.com" from "auth.example.com")
    const parts = hostname.split(".");
    const baseDomain = parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    return `${protocol}//${subdomain}.${baseDomain}${path}`;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/hr");
  const [targetSubdomain, setTargetSubdomain] = useState("hr");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cb = params.get("callbackUrl");
    const subdomain = params.get("subdomain");
    
    if (cb) {
      // Normalize callback URL - ensure it starts with /hr, /admin, etc.
      let normalizedUrl = cb;
      if (!cb.startsWith("/hr") && !cb.startsWith("/admin") && !cb.startsWith("/master")) {
        // If it's /dashboard or similar, convert to /hr
        if (cb.startsWith("/dashboard")) {
          normalizedUrl = cb.replace("/dashboard", "/hr");
        } else {
          normalizedUrl = `/hr${cb}`;
        }
      }
      setCallbackUrl(normalizedUrl);
    }
    
    if (subdomain) {
      setTargetSubdomain(subdomain);
    } else if (cb) {
      // Determine subdomain from callback URL
      if (cb.startsWith("/admin")) {
        setTargetSubdomain("admin");
      } else if (cb.startsWith("/master")) {
        setTargetSubdomain("master");
      } else {
        setTargetSubdomain("hr");
      }
    }
  }, []);
  
  // Helper to strip subdomain prefix from path for URL
  function stripSubdomainPrefix(path: string, subdomain: string): string {
    const prefix = `/${subdomain}`;
    if (path.startsWith(prefix)) {
      const remaining = path.slice(prefix.length);
      return remaining || "/";
    }
    return path;
  }
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      const result = await loginClient(email, password);
      
      if (result.status) {
        // Get port from current URL
        const port = window.location.port || "3001";
        // Strip subdomain prefix from callback URL for the final URL
        const finalPath = stripSubdomainPrefix(callbackUrl, targetSubdomain);
        // Build redirect URL with correct subdomain and port
        const redirectUrl = buildSubdomainUrl(targetSubdomain, finalPath, port);
        // Use window.location for full page navigation to change subdomain
        window.location.href = redirectUrl;
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <LogIn className="h-5 w-5 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              disabled={isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                disabled={isPending}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full mt-6" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          
          <div className="w-full pt-4 mt-2 border-t border-border/50">
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Powered by
              </p>
              <div className="flex items-center gap-1.5">
                <Image
                  src="/logo.png"
                  alt="Innovative Network Logo"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Innovative Network Pvt Ltd
                </span>
              </div>
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
}
