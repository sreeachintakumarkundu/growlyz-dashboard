import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get('gz_token')?.value;

  const protectedPaths = ['/dashboard', '/admin', '/super-admin'];
  const authPaths = ['/login', '/signup'];

  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!cookie) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (authPaths.includes(pathname) && cookie) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/super-admin/:path*', '/login', '/signup'],
};
