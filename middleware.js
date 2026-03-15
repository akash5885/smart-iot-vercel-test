import { NextResponse } from 'next/server'

export function middleware(request) {
  const token = request.cookies.get('iot_auth_token')?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
