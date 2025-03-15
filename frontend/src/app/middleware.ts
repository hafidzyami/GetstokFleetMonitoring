import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.split(' ')[1];
  const path = request.nextUrl.pathname;
  
  // Paths that don't require authentication
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.some(pp => path.startsWith(pp));
  
  // If path is public and user has token, redirect to appropriate page
  if (isPublicPath && token) {
    // You may need a way to determine role here
    // This is a simple example - in production you might decode the JWT
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // If path requires auth and user doesn't have token
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, api routes, etc.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};