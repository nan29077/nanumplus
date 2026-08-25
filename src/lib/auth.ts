import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { rateLimit, isRateLimited } from "./rate-limit";

/**
 * 인증 정책
 *  - 관리자(SUPER_ADMIN/ORG_ADMIN): 이메일+비밀번호(Credentials) 로그인.
 *  - 후원자(DonorAccount): 카카오/네이버/구글 OAuth 로그인 (플랫폼 통합 계정).
 *
 * OAuth 로그인은 항상 "후원자"로 처리한다. (관리자 화면은 OAuth 버튼을 노출하지 않는다.)
 * 후원자 세션은 role="DONOR" 이며 /admin·/org 는 미들웨어에서 차단된다.
 */

const LOGIN_FAIL_LIMIT = 10;
const LOGIN_FAIL_WINDOW_MS = 60_000 * 10;

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
      role: "SUPER_ADMIN" | "ORG_ADMIN" | "DONOR";
      organizationId: string | null;
      kind: "admin" | "donor";
      donorAccountId: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "SUPER_ADMIN" | "ORG_ADMIN" | "DONOR";
    organizationId?: string | null;
    kind?: "admin" | "donor";
    donorAccountId?: string | null;
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
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // OAuth = 후원자. DonorAccount upsert.
      if (account?.type === "oauth") {
        if (!account.providerAccountId) return false;
        await prisma.donorAccount.upsert({
          where: {
            provider_providerId: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          },
          update: {
            lastLoginAt: new Date(),
            ...(user.name ? { name: user.name } : {}),
            ...(user.email ? { email: user.email } : {}),
            ...(user.image ? { profileImage: user.image } : {}),
          },
          create: {
            provider: account.provider,
            providerId: account.providerAccountId,
            name: user.name ?? (user.email ? user.email.split("@")[0] : "후원자"),
            email: user.email ?? null,
            profileImage: user.image ?? null,
          },
        });
        return true;
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // OAuth 후원자 로그인 시점
      if (account?.type === "oauth" && account.providerAccountId) {
        const da = await prisma.donorAccount.findUnique({
          where: {
            provider_providerId: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          },
        });
        token.kind = "donor";
        token.role = "DONOR";
        token.donorAccountId = da?.id ?? null;
        token.id = da?.id ?? token.id;
        token.name = da?.name ?? token.name;
        token.email = da?.email ?? token.email;
        if (da?.profileImage) token.picture = da.profileImage;
        return token;
      }

      // Credentials 관리자 로그인 시점
      if (user) {
        const u = user as { id: string; role?: "SUPER_ADMIN" | "ORG_ADMIN"; organizationId?: string | null };
        token.kind = "admin";
        token.id = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId ?? null;
      }

      // 관리자 토큰 역할 보강 (후원자 토큰은 건너뜀)
      if (token.kind !== "donor" && token.id && !token.role) {
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
      if (token.kind === "donor") {
        session.user = {
          id: (token.donorAccountId as string) ?? "",
          email: (token.email as string) ?? "",
          name: (token.name as string) ?? "후원자",
          role: "DONOR",
          organizationId: null,
          kind: "donor",
          donorAccountId: (token.donorAccountId as string) ?? null,
          image: (token.picture as string) ?? null,
        };
        return session;
      }
      session.user.id = token.id as string;
      session.user.role = (token.role as "SUPER_ADMIN" | "ORG_ADMIN") ?? "ORG_ADMIN";
      session.user.organizationId = (token.organizationId as string | null) ?? null;
      session.user.kind = "admin";
      session.user.donorAccountId = null;
      return session;
    },
  },
};
