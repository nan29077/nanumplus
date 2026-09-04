import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * 경로 보호 미들웨어.
 * - /admin/*, /api/admin/*  → SUPER_ADMIN 전용
 * - /org/*,   /api/org/*    → ORG_ADMIN 전용
 *
 * 응답 정책
 *  - 화면 경로: 미인증 → /login 리다이렉트, 권한 불일치 → 본인 영역으로 리다이렉트
 *  - API 경로 : 302 리다이렉트를 주면 fetch 가 로그인 HTML(200)을 받아 원인 파악이 어렵고
 *               클라이언트가 실패를 감지하지 못한다. 401/403 JSON 으로 응답한다.
 *
 * 무효 토큰(token.invalid)은 로그아웃·비밀번호 변경으로 tokenVersion 이 올라간 경우다.
 * 미들웨어는 DB 를 조회할 수 없으므로 최종 판정은 서버 컴포넌트/API 의 세션 조회에서 이뤄지고,
 * 여기서는 이미 무효 표시가 붙은 토큰만 걸러낸다.
 */

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function unauthorized(isApi: boolean, base: string, pathname: string, search: string) {
  if (isApi) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const login = new URL("/login", base);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

function forbidden(isApi: boolean, base: string, fallbackPath: string, message: string) {
  if (isApi) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return NextResponse.redirect(new URL(fallbackPath, base));
}

export default withAuth(
  function middleware(req) {
    const { pathname, search } = req.nextUrl;
    const token = req.nextauth.token;
    const isApi = isApiPath(pathname);

    // 1) 토큰 없음 / 무효화된 토큰
    if (!token || token.invalid === true) {
      return unauthorized(isApi, req.url, pathname, search);
    }

    const role = token.role as "SUPER_ADMIN" | "ORG_ADMIN" | "DONOR" | undefined;

    // 2) 관리자 role 이 아님 (후원자 세션 포함)
    if (role !== "SUPER_ADMIN" && role !== "ORG_ADMIN") {
      return unauthorized(isApi, req.url, pathname, search);
    }

    // 3) 영역별 권한
    if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && role !== "SUPER_ADMIN") {
      return forbidden(isApi, req.url, "/org/dashboard", "최고 관리자 권한이 필요합니다.");
    }
    if ((pathname.startsWith("/org") || pathname.startsWith("/api/org")) && role !== "ORG_ADMIN") {
      return forbidden(isApi, req.url, "/admin/dashboard", "기관 관리자 전용입니다.");
    }

    // 4) 초기 비밀번호 강제 변경 — 비밀번호 변경 화면/API 외에는 접근 차단
    if (token.pwChange === true && role === "ORG_ADMIN") {
      const allowed =
        pathname.startsWith("/org/settings") || pathname.startsWith("/api/org/password");
      if (!allowed) {
        if (isApi) {
          return NextResponse.json(
            { error: "초기 비밀번호를 변경해야 합니다.", code: "PASSWORD_CHANGE_REQUIRED" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/org/settings?pwchange=1", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // 인증 판정은 위 미들웨어 본문에서 직접 처리한다.
      // (여기서 false 를 돌려주면 API 요청까지 로그인 페이지로 302 되어버린다.)
      authorized: () => true,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/org/:path*", "/api/admin/:path*", "/api/org/:path*"],
};
