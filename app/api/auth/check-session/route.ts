import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

// Decode JWT token to check expiration (without verification)
function decodeToken(token: string): { exp?: number; iat?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { exp?: number; iat?: number };
    return parsed;
  } catch {
    return null;
  }
}

// Check if token is already expired (SECURITY: Never refresh expired tokens)
function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const expirationTime = decoded.exp * 1000;
  const now = Date.now();
  
  // Return true if token is already expired
  return now >= expirationTime;
}

// Check if token is expiring soon but still valid (within 30 minutes)
// SECURITY: Only refresh if token is still valid (not expired)
function isTokenExpiringSoon(token: string | null | undefined): boolean {
  if (!token) return false;
  
  // SECURITY: If token is already expired, don't refresh
  if (isTokenExpired(token)) return false;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;
  
  const expirationTime = decoded.exp * 1000;
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  // Return true only if token is still valid AND expires within 30 minutes
  return expirationTime - now < thirtyMinutes && expirationTime > now;
}

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value || null;
  const refreshToken = cookieStore.get("refreshToken")?.value || null;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ valid: false, reason: "no_tokens" });
  }

  // SECURITY CHECK 1: If access token is expired, clear it immediately
  if (accessToken && isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    accessToken = null;
  }

  // SECURITY CHECK 2: Proactive refresh only if token is valid but expiring soon
  // Never refresh if token is already expired
  if (accessToken && isTokenExpiringSoon(accessToken) && refreshToken) {
    // Only refresh if refresh token is also valid (not expired)
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await tryRefresh(refreshToken, cookieStore);
      if (refreshed) {
        const newToken = cookieStore.get("accessToken")?.value;
        accessToken = newToken ? newToken : null;
      }
    } else {
      // Refresh token expired, clear everything
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
      return NextResponse.json({ valid: false, reason: "refresh_token_expired" });
    }
  }

  // If no access token but have refresh token, try to get new access token
  if (!accessToken && refreshToken) {
    // SECURITY: Only refresh if refresh token is not expired
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await tryRefresh(refreshToken, cookieStore);
      if (refreshed) {
        const newToken = cookieStore.get("accessToken")?.value;
        accessToken = newToken ? newToken : null;
      } else {
        // Refresh failed, clear cookies
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("userRole");
        cookieStore.delete("user");
        return NextResponse.json({ valid: false, reason: "refresh_failed" });
      }
    } else {
      // Refresh token expired, clear everything (security: expired = invalid)
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
      return NextResponse.json({ valid: false, reason: "refresh_token_expired" });
    }
  }

  if (!accessToken) {
    return NextResponse.json({ valid: false, reason: "no_access_token" });
  }

  // SECURITY CHECK 3: Final validation - ensure token is not expired before API call
  if (isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("userRole");
    cookieStore.delete("user");
    return NextResponse.json({ valid: false, reason: "access_token_expired" });
  }

  // Try with access token
    try {
      const res = await fetch(`${API_BASE}/auth/check-session`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        return NextResponse.json({ valid: true });
      }

      // Token expired, try refresh
      if (res.status === 401) {
      if (refreshToken) {
        const refreshed = await tryRefresh(refreshToken, cookieStore);
        if (refreshed) {
          return NextResponse.json({ valid: true });
        }
        }
      }
    } catch (error) {
      console.error("Session check error:", error);
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

  // SECURITY CHECK: Verify refresh token is not expired before attempting refresh
  if (isTokenExpired(refreshToken)) {
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();

    if (data.status && data.data) {
      const newAccessToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken;

      // SECURITY CHECK: Validate new tokens are not expired before storing
      if (isTokenExpired(newAccessToken) || isTokenExpired(newRefreshToken)) {
        console.error("Security: Received expired tokens from refresh endpoint");
        return false;
      }

      // Update cookies with new tokens
      cookieStore.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60, // 2 hours (matches backend access token expiry)
        path: "/",
      });

      cookieStore.set("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days to match backend refresh token expiry
        path: "/",
      });

      return true;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
  }

  return false;
}

