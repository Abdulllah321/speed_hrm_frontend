import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_URL || "http://localhost:8080/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { status: false, message: "Email and password are required" },
        { status: 400 }
      )
    }

    // Get client IP and User-Agent for backend
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Make request to NestJS backend
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Forwarded-For": ipAddress,
        "User-Agent": userAgent
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (data.status && data.data) {
      // Create response
      const response = NextResponse.json({
        status: true,
        message: "Login successful",
        data: {
          user: data.data.user
        }
      })

      // Set cookies in the browser with proper domain for subdomain sharing
      const isDevelopment = process.env.NODE_ENV !== 'production'
      const domain = isDevelopment ? '.localtest.me' : process.env.COOKIE_DOMAIN || '.yourdomain.com'
      
      const cookieOptions = {
        httpOnly: true,
        secure: !isDevelopment, // HTTPS in production, HTTP in development
        sameSite: 'lax' as const,
        domain: domain, // This allows sharing across subdomains
        path: '/'
      }
      
      // Set access token (shorter expiry)
      response.cookies.set('accessToken', data.data.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 // 15 minutes in seconds
      })
      
      // Set refresh token (longer expiry)
      response.cookies.set('refreshToken', data.data.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      })
      
      // Set user role for middleware
      response.cookies.set('userRole', data.data.user.role || '', {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      })
      
      // Set user data (for client-side access)
      response.cookies.set('user', JSON.stringify(data.data.user), {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      })

      return response
    }

    return NextResponse.json(
      { status: false, message: data.message || "Login failed" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { status: false, message: "Failed to connect to server" },
      { status: 500 }
    )
  }
}