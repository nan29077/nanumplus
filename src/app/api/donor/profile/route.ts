import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDonorSession } from "@/lib/donor-auth";
import { sanitizeText } from "@/lib/sanitize";

const schema = z.object({
  name: z.string().min(1).max(40).optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
});

/** 후원자 본인 프로필(이름·연락처) 수정 */
export async function PATCH(req: Request) {
  const donor = await getDonorSession();
  if (!donor) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  const d = parsed.data;

  await prisma.donorAccount.update({
    where: { id: donor.donorAccountId },
    data: {
      ...(d.name !== undefined ? { name: sanitizeText(d.name, 40) } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
    },
  });
  return Response.json({ ok: true });
}
