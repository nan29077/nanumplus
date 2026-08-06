import { apiAuth } from "@/lib/rbac";
import { generateSettlements } from "@/services/settlement";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

/** 미처리 후원 건에 대해 정산 데이터 일괄 생성 */
export async function POST(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const organizationId: string | undefined = body?.organizationId;

  try {
    const result = await generateSettlements(organizationId);

    await writeAuditLog({
      userId: auth.user.id,
      action: "SETTLEMENT_GENERATE",
      entityType: "Settlement",
      detail: { ...result, organizationId },
      ipAddress: getClientIp(req.headers),
    });

    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[settlements/generate] 정산 생성 오류:", e);
    return Response.json({ error: "정산 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
