import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Jika mengakses root path '/', redirect ke halaman login
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Tentukan pada path mana middleware ini akan dijalankan
export const config = {
  matcher: "/",
};
