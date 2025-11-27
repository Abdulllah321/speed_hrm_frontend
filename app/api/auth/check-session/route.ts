import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ valid: false, reason: "no_tokens" });
  }

  // Try with access token first
  if (accessToken) {
    try {
      const res = await fetch(`${API_BASE}/auth/check-session`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        return NextResponse.json({ valid: true });
      }

      // Token expired, try refresh
      if (res.status === 401) {
        const refreshed = await tryRefresh(refreshToken, cookieStore);
        if (refreshed) {
          return NextResponse.json({ valid: true });
        }
      }
    } catch (error) {
      console.error("Session check error:", error);
    }
  }

  // No access token, try refresh directly
  if (refreshToken && !accessToken) {
    const refreshed = await tryRefresh(refreshToken, cookieStore);
    if (refreshed) {
      return NextResponse.json({ valid: true });
    }
  }

  // Clear invalid cookies
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  cookieStore.delete("userRole");
  cookieStore.delete("user");

  return NextResponse.json({ valid: false, reason: "session_expired" });
}

async function tryRefresh(refreshToken: string | undefined, cookieStore: any): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();

    if (data.status && data.data) {
      // Update cookies with new tokens
      cookieStore.set("accessToken", data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      });

      cookieStore.set("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day (session duration)
        path: "/",
      });

      return true;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
  }

  return false;
}

