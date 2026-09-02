import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { apiAuth } from "@/lib/rbac";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;
const kindSchema = z.enum(["hero", "logo", "story"]);
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function hasValidSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.slice(0, 8).every((b, i) => b === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i]);
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  return false;
}

export async function POST(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  let form: FormData;
  try { form = await req.formData(); } catch { return Response.json({ error: "첨부 파일을 읽을 수 없습니다." }, { status: 400 }); }
  const file = form.get("file");
  const kindParsed = kindSchema.safeParse(form.get("kind"));
  if (!(file instanceof File) || !kindParsed.success) return Response.json({ error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  if (!MIME_EXT[file.type]) return Response.json({ error: "JPG, PNG, WEBP, GIF 이미지만 첨부할 수 있습니다." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_SIZE) return Response.json({ error: "이미지는 8MB 이하로 첨부해 주세요." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) return Response.json({ error: "올바른 이미지 파일이 아닙니다." }, { status: 400 });

  const orgId = auth.user.organizationId!;
  const relativeDir = path.join("uploads", "donation-pages", orgId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  const filename = `${kindParsed.data}-${Date.now()}-${randomUUID()}.${MIME_EXT[file.type]}`;
  await writeFile(path.join(absoluteDir, filename), bytes, { flag: "wx" });

  return Response.json({ url: `/${relativeDir.replaceAll(path.sep, "/")}/${filename}` }, { status: 201 });
}
