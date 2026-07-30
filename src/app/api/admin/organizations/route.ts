import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeSlug, sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { generateQrDataUrl, donatePageUrl } from "@/lib/qr";
import { getClientIp } from "@/lib/validation";

const createSchema = z.object({
  name: z.string().min(1, "기관명을 입력해 주세요.").max(80),
  slug: z.string().min(2, "주소(slug)는 2자 이상이어야 합니다.").max(80),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("기관 이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  adminName: z.string().min(1, "관리자 이름을 입력해 주세요.").max(40),
  adminEmail: z.string().email("관리자 이메일 형식이 올바르지 않습니다."),
  adminPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
  smsCode: z.string().regex(/^\d{4}$/, "문자 코드는 4자리 숫자여야 합니다.").optional().or(z.literal("")),
  bankName: z.string().max(50).optional(),
  bankAccount: z.string().max(50).optional(),
  bankHolder: z.string().max(50).optional(),
});

/** 기관 목록 */
export async function GET() {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      admins: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { donations: true, donors: true, campaigns: true } },
    },
  });
  return Response.json({ organizations: orgs });
}

/** 기관 + 기관 관리자 계정 생성 */
export async function POST(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const d = parsed.data;
  const slug = sanitizeSlug(d.slug);
  if (!slug) return Response.json({ error: "유효한 주소(slug)를 입력해 주세요." }, { status: 400 });

  // 중복 검사
  const [slugDup, emailDup] = await Promise.all([
    prisma.organization.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email: d.adminEmail.toLowerCase().trim() } }),
  ]);
  if (slugDup) return Response.json({ error: "이미 사용 중인 기관 주소(slug)입니다." }, { status: 409 });
  if (emailDup) return Response.json({ error: "이미 사용 중인 관리자 이메일입니다." }, { status: 409 });

  let smsCode: string | null = null;
  let smsFullNumber: string | null = null;
  if (d.smsCode) {
    smsCode = d.smsCode;
    smsFullNumber = `#2540-${d.smsCode}`;
    const codeDup = await prisma.organization.findFirst({
      where: { OR: [{ smsCode }, { smsFullNumber }] },
    });
    if (codeDup) return Response.json({ error: "이미 부여된 문자후원 코드입니다." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(d.adminPassword, 10);

  const org = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.organization.create({
      data: {
        name: sanitizeText(d.name, 80),
        slug,
        description: d.description ? sanitizeText(d.description, 500) : null,
        address: d.address ? sanitizeText(d.address, 200) : null,
        phone: d.phone || null,
        email: d.email || null,
        smsBaseNumber: "#2540",
        smsCode,
        smsFullNumber,
        bankName: d.bankName || null,
        bankAccount: d.bankAccount || null,
        bankHolder: d.bankHolder || null,
      },
    });

    const user = await tx.user.create({
      data: {
        name: sanitizeText(d.adminName, 40),
        email: d.adminEmail.toLowerCase().trim(),
        passwordHash,
        role: "ORG_ADMIN",
      },
    });
    await tx.organizationAdmin.create({
      data: { userId: user.id, organizationId: created.id },
    });

    if (smsCode && smsFullNumber) {
      await tx.smsNumberAssignment.create({
        data: {
          organizationId: created.id,
          baseNumber: "#2540",
          code: smsCode,
          fullNumber: smsFullNumber,
          assignedById: auth.user.id,
        },
      });
    }

    // QR 코드 생성
    const targetUrl = donatePageUrl(slug);
    const imageDataUrl = await generateQrDataUrl(targetUrl);
    await tx.qrCode.create({
      data: { organizationId: created.id, targetUrl, imageDataUrl },
    });
    await tx.organization.update({
      where: { id: created.id },
      data: { qrCodeUrl: imageDataUrl },
    });

    return created;
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_CREATE",
    entityType: "Organization",
    entityId: org.id,
    detail: { name: org.name, slug, smsCode },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, organizationId: org.id });
}
