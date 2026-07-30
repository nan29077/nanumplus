import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";

// 로그인 직후 역할에 따라 적절한 대시보드로 리다이렉트
export const dynamic = "force-dynamic";

export default async function AfterLoginPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=session");
  if (user.role === "SUPER_ADMIN") redirect("/admin/dashboard");
  // 소속 기관이 없는 기관관리자는 /org/* 가 다시 /login 으로 되돌려 무한 이동이 된다.
  // 로그인 화면에서 원인을 안내하도록 그대로 돌려보낸다.
  if (!user.organizationId) redirect("/login?error=no-org");
  redirect("/org/dashboard");
}
