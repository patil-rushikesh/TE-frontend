import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export async function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected-page)
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register']
  const isPublicPath = publicPaths.includes(path)

  // If accessing a public path, allow the request
  if (isPublicPath) {
    return NextResponse.next()
  }

  // For API routes inside this app, let them handle authentication internally
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!verifyResponse.ok) {
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' })
      return response
    }
  } catch (error) {
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set('auth_token', '', { maxAge: 0, path: '/' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}