import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("dev-role")?.value;

  // Public routes — always accessible
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (role) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Landing page — always accessible
  if (pathname === "/") {
    return NextResponse.next();
  }

  // All other routes require a role
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin routes require admin role
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|seed/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2|otf)$).*)",
  ],
};
