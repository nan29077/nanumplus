import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true, email: true, deletedAt: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const withEmail = orgs.filter((o) => o.email && o.email.trim());
  const withoutEmail = orgs.filter((o) => !o.email || !o.email.trim());

  const norm = (e: string) => e.toLowerCase().trim();
  const counts = new Map<string, string[]>();
  for (const o of withEmail) {
    const k = norm(o.email!);
    counts.set(k, [...(counts.get(k) ?? []), o.name]);
  }
  const dups = [...counts.entries()].filter(([, v]) => v.length > 1);

  const existingUsers = await prisma.user.count();
  const existingOrgAdmins = await prisma.organizationAdmin.count();

  const lines = [
    `전체 기관 수: ${orgs.length}`,
    `삭제됨(deletedAt) 기관 수: ${orgs.filter((o) => o.deletedAt).length}`,
    `비활성 기관 수: ${orgs.filter((o) => !o.isActive).length}`,
    `이메일 있는 기관: ${withEmail.length}`,
    `이메일 없는 기관: ${withoutEmail.length}`,
    `고유 이메일 수: ${counts.size}`,
    `중복 이메일 그룹 수: ${dups.length}`,
    `기존 User 수: ${existingUsers}`,
    `기존 OrganizationAdmin 수: ${existingOrgAdmins}`,
    ``,
    `--- 중복 이메일 ---`,
    ...dups.map(([e, names]) => `${e} => ${names.join(" | ")}`),
    ``,
    `--- 이메일 없는 기관 (최대 30개) ---`,
    ...withoutEmail.slice(0, 30).map((o) => `${o.name} (${o.slug})`),
    ``,
    `--- 샘플 5건 ---`,
    ...withEmail.slice(0, 5).map((o) => `${o.name} (${o.slug}) : ${o.email}`),
  ];

  writeFileSync("E:\\프로젝트\\nanumplus\\prisma\\org-email-report.txt", lines.join("\n"), "utf8");
  console.log("report written");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
