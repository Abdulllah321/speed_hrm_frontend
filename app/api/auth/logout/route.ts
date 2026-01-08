import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_BASE = process.env.API_URL || "http://localhost:8080/api"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    // Call backend logout if we have a token
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
      } catch (error) {
        console.error("Backend logout error:", error)
        // Continue with cookie clearing even if backend call fails
      }
    }

    // Create response
    const response = NextResponse.json({
      status: true,
      message: "Logged out successfully"
    })

    // Clear cookies with proper domain
    const isDevelopment = process.env.NODE_ENV !== 'production'
    const domain = isDevelopment ? '.localtest.me' : process.env.COOKIE_DOMAIN || '.yourdomain.com'
    
    const clearCookieOptions = {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'lax' as const,
      domain: domain,
      path: '/',
      maxAge: 0 // This clears the cookie
    }
    
    response.cookies.set('accessToken', '', clearCookieOptions)
    response.cookies.set('refreshToken', '', clearCookieOptions)
    response.cookies.set('userRole', '', clearCookieOptions)
    response.cookies.set('user', '', clearCookieOptions)

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { status: false, message: "Logout failed" },
      { status: 500 }
    )
  }
}