import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { rateLimit, isRateLimited } from "./rate-limit";
import { resolveClientIp } from "./client-ip";

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

/**
 * 로그인 rate-limit 키로 쓸 클라이언트 IP.
 * X-Forwarded-For 의 첫 항목은 클라이언트가 위조할 수 있으므로(스푸핑으로 실패 제한 무력화),
 * 우리 앞단 프록시가 붙인 마지막 홉만 신뢰한다. (src/lib/client-ip.ts)
 */
function loginClientIp(): string {
  try {
    const h = headers();
    return resolveClientIp((n) => h.get(n));
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
    /** 발급 시점의 User.tokenVersion — DB 값과 다르면 무효 토큰 */
    tv?: number;
    /** 초기 비밀번호 상태(강제 변경 필요) */
    pwChange?: boolean;
    /** 무효 처리된 토큰 표시 (미들웨어/세션에서 차단) */
    invalid?: boolean;
  }
}

type LoginUserRow = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ORG_ADMIN";
  isActive: boolean;
  deletedAt: Date | null;
  passwordHash: string | null;
  tokenVersion?: number;
  passwordChangeRequired?: boolean;
  organizationAdmin: { organizationId: string } | null;
};

const LOGIN_BASE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  deletedAt: true,
  passwordHash: true,
  organizationAdmin: { select: { organizationId: true } },
} as const;

/**
 * 로그인용 사용자 조회.
 * tokenVersion / passwordChangeRequired 컬럼이 아직 실서버에 반영되지 않은 경우
 * (prisma/sync-prod-20260904-auth-hardening.sql 미적용) 에도 로그인이 막히지 않도록
 * 컬럼 없이 한 번 더 조회한다.
 */
async function loadUserForLogin(email: string): Promise<LoginUserRow | null> {
  try {
    return (await prisma.user.findUnique({
      where: { email },
      select: { ...LOGIN_BASE_SELECT, tokenVersion: true, passwordChangeRequired: true },
    })) as LoginUserRow | null;
  } catch (e) {
    console.error(
      "[auth] tokenVersion/passwordChangeRequired 컬럼 조회 실패 — " +
        "prisma/sync-prod-20260904-auth-hardening.sql 을 적용하세요. 우선 기존 컬럼만으로 로그인합니다.",
      e
    );
    return (await prisma.user.findUnique({
      where: { email },
      select: LOGIN_BASE_SELECT,
    })) as LoginUserRow | null;
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

      const user = await loadUserForLogin(credentials.email.toLowerCase().trim());
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
        tokenVersion: user.tokenVersion ?? 0,
        passwordChangeRequired: user.passwordChangeRequired ?? false,
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

/**
 * 토큰 무효화 — next-auth v4 의 jwt 콜백은 null 을 돌려줄 수 없으므로
 * 신원 클레임을 모두 지우고 invalid 플래그를 세운다.
 * 미들웨어(authorized)와 session 콜백이 이 플래그를 보고 접근을 차단한다.
 */
function invalidateToken<T extends Record<string, unknown>>(token: T): T {
  const t = token as Record<string, unknown>;
  t.invalid = true;
  t.id = undefined;
  t.role = undefined;
  t.organizationId = null;
  t.donorAccountId = null;
  t.tv = undefined;
  t.pwChange = false;
  return token;
}

type AdminTokenRow = {
  role: "SUPER_ADMIN" | "ORG_ADMIN";
  isActive: boolean;
  deletedAt: Date | null;
  tokenVersion: number;
  passwordChangeRequired: boolean;
  organizationAdmin: { organizationId: string } | null;
};

/**
 * 토큰 재검증용 사용자 조회.
 *
 * tokenVersion / passwordChangeRequired 컬럼은
 * `prisma/sync-prod-20260904-auth-hardening.sql` 로 추가된다.
 * SQL 을 적용하기 전에 코드가 먼저 배포되면 컬럼이 없어 조회가 실패하는데,
 * 그때 전 관리자가 로그아웃되면 곤란하므로 "unavailable" 로 구분해 통과시킨다.
 * (컬럼이 반영되면 정상 검증 경로로 자동 복귀한다.)
 */
async function loadAdminForToken(userId: string): Promise<AdminTokenRow | null | "unavailable"> {
  try {
    return (await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        deletedAt: true,
        tokenVersion: true,
        passwordChangeRequired: true,
        organizationAdmin: { select: { organizationId: true } },
      },
    })) as AdminTokenRow | null;
  } catch (e) {
    console.error(
      "[auth] 토큰 재검증 조회 실패 — tokenVersion/passwordChangeRequired 컬럼이 없을 수 있습니다. " +
        "prisma/sync-prod-20260904-auth-hardening.sql 적용 후 prisma generate 하세요.",
      e
    );
    return "unavailable";
  }
}

/** 로그아웃·비밀번호 변경 시 호출 — 해당 사용자의 기존 JWT 를 전부 무효화한다. */
export async function bumpTokenVersion(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  } catch (e) {
    console.error("[auth] tokenVersion 증가 실패", e);
  }
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
        // 삭제 처리된 후원자 계정은 로그인 차단 (upsert가 계정을 되살리지 않도록 선검사)
        const existing = await prisma.donorAccount.findUnique({
          where: {
            provider_providerId: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          },
          select: { deletedAt: true },
        });
        if (existing?.deletedAt) return false;
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
        const u = user as {
          id: string;
          role?: "SUPER_ADMIN" | "ORG_ADMIN";
          organizationId?: string | null;
          tokenVersion?: number;
          passwordChangeRequired?: boolean;
        };
        token.kind = "admin";
        token.id = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId ?? null;
        token.tv = u.tokenVersion ?? 0;
        token.pwChange = u.passwordChangeRequired === true;
        token.invalid = false;
        return token;
      }

      // ── 관리자 토큰 재검증 (매 요청) ──────────────────────────────────────
      // JWT 는 서버가 회수할 수 없으므로, User.tokenVersion 카운터로 무효화한다.
      // 로그아웃 / 비밀번호 변경 / 비밀번호 초기화 시 카운터가 올라가고,
      // 토큰에 박힌 tv 와 값이 다르면 그 토큰은 즉시 무효 처리한다.
      if (token.kind !== "donor" && token.id) {
        const dbUser = await loadAdminForToken(token.id as string);

        // 조회 자체가 실패(DB 일시 장애 등)하면 토큰을 그대로 두고 통과시킨다.
        // (아래 loadAdminForToken 이 null 대신 "unknown" 을 돌려주는 경우)
        if (dbUser === "unavailable") return token;

        if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
          return invalidateToken(token);
        }
        if ((token.tv ?? 0) !== dbUser.tokenVersion) {
          return invalidateToken(token);
        }

        token.role = dbUser.role;
        token.organizationId = dbUser.organizationAdmin?.organizationId ?? null;
        token.pwChange = dbUser.passwordChangeRequired === true;
        token.invalid = false;
      }
      return token;
    },

    async session({ session, token }) {
      // 무효화된 토큰(로그아웃·비밀번호 변경·계정 비활성) → 세션 없음으로 취급
      if (token.invalid) {
        session.user = undefined as never;
        return session;
      }
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

  events: {
    /**
     * 로그아웃 시 tokenVersion 을 올려 해당 계정의 기존 JWT 를 모두 무효화한다.
     * (쿠키만 지우면 탈취된 토큰은 만료 전까지 계속 유효하다.)
     */
    async signOut({ token }) {
      if (token?.kind === "donor") return;
      const id = token?.id as string | undefined;
      if (id) await bumpTokenVersion(id);
    },
  },
};
