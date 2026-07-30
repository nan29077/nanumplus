import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { rateLimit, isRateLimited } from "./rate-limit";

/** 로그인 실패 제한: IP당 10분에 10회 */
const LOGIN_FAIL_LIMIT = 10;
const LOGIN_FAIL_WINDOW_MS = 60_000 * 10;

/** 요청 헤더에서 클라이언트 IP 추출 (헤더 접근 불가 시 "unknown") */
function loginClientIp(): string {
  try {
    const h = headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "SUPER_ADMIN" | "ORG_ADMIN";
      organizationId: string | null;
    };
  }
}

const providers = [
  CredentialsProvider({
    name: "이메일 로그인",
    credentials: {
      email: { label: "이메일", type: "email" },
      password: { label: "비밀번호", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      // 무차별 대입 방지: IP당 10분에 10회 실패하면 잠금
      const rlKey = `login-fail:${loginClientIp()}`;
      if (isRateLimited(rlKey, LOGIN_FAIL_LIMIT)) {
        throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
      }
      const fail = () => {
        rateLimit(rlKey, LOGIN_FAIL_LIMIT, LOGIN_FAIL_WINDOW_MS);
        return null;
      };

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
        include: { organizationAdmin: true },
      });
      if (!user || !user.isActive || user.deletedAt) return fail();
      if (!user.passwordHash) return fail();
      const ok = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!ok) return fail();
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationAdmin?.organizationId ?? null,
      } as never;
    },
  }),
];

// OAuth 공급자 — 환경변수가 설정된 경우에만 활성화
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as never
  );
}

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }) as never
  );
}

if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    }) as never
  );
}

export const authOptions: NextAuthOptions = {
  // JWT 세션 전략 — credentials 로그인은 어댑터 불필요
  // OAuth 연동 시 @next-auth/prisma-adapter 로 교체
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // OAuth 로그인: DB에 사용자가 없으면 기본 ORG_ADMIN으로 자동 생성
      if (account?.type === "oauth") {
        if (!user.email) return false;
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing) {
          // 비활성화·삭제된 계정은 OAuth로도 로그인 차단
          if (!existing.isActive || existing.deletedAt) return false;
        } else {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email.split("@")[0],
              role: "ORG_ADMIN",
              isActive: true,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as { id: string; role?: string; organizationId?: string | null };
        token.id = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId ?? null;
      }
      // OAuth 로그인 시 user.id는 공급자 계정 ID이므로 DB User와 다르다.
      // email로 DB User를 조회해 실제 ID/역할/소속 기관으로 교체한다.
      if (account?.type === "oauth" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { organizationAdmin: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationAdmin?.organizationId ?? null;
        }
      }
      // JWT가 갱신될 때마다 DB에서 최신 역할 정보 조회
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { organizationAdmin: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationAdmin?.organizationId ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as "SUPER_ADMIN" | "ORG_ADMIN") ?? "ORG_ADMIN";
      session.user.organizationId = (token.organizationId as string | null) ?? null;
      return session;
    },
  },
};
