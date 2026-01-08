import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE = process.env.API_URL || "http://localhost:8080/api"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { status: false, message: "No refresh token found" },
        { status: 401 }
      )
    }

    // Make request to NestJS backend
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await res.json()

    if (data.status && data.data) {
      // Create response
      const response = NextResponse.json({
        status: true,
        message: "Token refreshed successfully"
      })

      // Set new cookies with proper domain for subdomain sharing
      const isDevelopment = process.env.NODE_ENV !== 'production'
      const domain = isDevelopment ? '.localtest.me' : process.env.COOKIE_DOMAIN || '.yourdomain.com'
      
      const cookieOptions = {
        httpOnly: true,
        secure: !isDevelopment,
        sameSite: 'lax' as const,
        domain: domain,
        path: '/'
      }
      
      // Update access token
      response.cookies.set('accessToken', data.data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 // 15 minutes in seconds
      })
      
      // Update refresh token
      response.cookies.set('refreshToken', data.data.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      })

      return response
    }

    return NextResponse.json(
      { status: false, message: data.message || "Token refresh failed" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json(
      { status: false, message: "Failed to refresh token" },
      { status: 500 }
    )
  }
}