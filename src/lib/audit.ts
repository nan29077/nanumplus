import { prisma } from "./prisma";

export async function writeAuditLog(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detail: params.detail as object | undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] 감사 로그 저장 실패", e);
  }
}
