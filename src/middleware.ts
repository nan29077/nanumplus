import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * 경로 보호 미들웨어.
 * - /admin/*  → SUPER_ADMIN 전용
 * - /org/*    → ORG_ADMIN 전용
 * 토큰이 없으면 /login 으로, 권한이 맞지 않으면 본인 영역으로 리다이렉트.
 */
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as "SUPER_ADMIN" | "ORG_ADMIN" | undefined;

    if (pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/org/dashboard", req.url));
    }
    if (pathname.startsWith("/org") && role !== "ORG_ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/org/:path*"],
};
