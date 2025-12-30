"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, AlertCircle } from "lucide-react";
import { login } from "@/lib/auth";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cb = params.get("callbackUrl");
    if (cb) setCallbackUrl(cb);
  }, []);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      
      if (result.status) {
        router.push(callbackUrl);
        router.refresh();
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
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
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
