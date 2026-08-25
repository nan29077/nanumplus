import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ORG_ADMIN" | "DONOR";
  organizationId: string | null;
  kind?: "admin" | "donor";
  donorAccountId?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser) ?? null;
}

/** 페이지용: 최고 관리자 강제 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/org/dashboard");
  return user;
}

/** 소속 기관이 살아있고 운영 중인지 확인 */
async function isOrgUsable(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  return org !== null;
}

/** 페이지용: 기관 관리자 강제 — 본인 organizationId 반환 */
export async function requireOrgAdmin(): Promise<SessionUser & { organizationId: string }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin/dashboard");
  // 화이트리스트: ORG_ADMIN 이외(DONOR 등)의 role은 기관 화면에 접근할 수 없다.
  if (user.role !== "ORG_ADMIN") redirect("/login");
  if (!user.organizationId) redirect("/login");
  // 삭제·비활성화된 기관의 관리자는 접근 차단
  if (!(await isOrgUsable(user.organizationId))) redirect("/login?error=org_inactive");
  return user as SessionUser & { organizationId: string };
}

/** API용: 401/403 응답 객체 또는 사용자 반환 */
export async function apiAuth(
  required: "SUPER_ADMIN" | "ORG_ADMIN"
): Promise<{ user: SessionUser } | { error: Response }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (required === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    return { error: Response.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 }) };
  }
  if (required === "ORG_ADMIN") {
    // C-1 화이트리스트 검증: role이 정확히 ORG_ADMIN이 아니면(SUPER_ADMIN·DONOR·미상)
    // 무조건 403. 이전에는 SUPER_ADMIN만 걸러내어 DONOR 세션이 기관 API를 통과했다.
    if (user.role !== "ORG_ADMIN") {
      return { error: Response.json({ error: "기관 관리자 전용 API입니다." }, { status: 403 }) };
    }
    if (!user.organizationId) {
      return { error: Response.json({ error: "소속 기관이 없습니다." }, { status: 403 }) };
    }
    // 삭제·비활성화된 기관의 관리자는 API 접근도 차단
    if (!(await isOrgUsable(user.organizationId))) {
      return {
        error: Response.json({ error: "소속 기관이 비활성화되었습니다." }, { status: 403 }),
      };
    }
  }
  return { user };
}

/**
 * 기관 데이터 스코프: 기관 관리자는 항상 본인 organizationId로 제한.
 * 최고 관리자는 orgId 파라미터(선택)로 필터.
 */
export function orgScope(user: SessionUser, requestedOrgId?: string | null) {
  if (user.role === "SUPER_ADMIN") {
    return requestedOrgId ? { organizationId: requestedOrgId } : {};
  }
  return { organizationId: user.organizationId! };
}
