import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function generateQrDataUrl(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#114032", light: "#FFFFFF" },
  });
}

export function donatePageUrl(slug: string, base?: string) {
  // 개발 서버 기본 포트는 3005 (package.json의 dev/start 스크립트와 동일)
  const resolvedBase = base ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005";
  return `${resolvedBase}/donate/${slug}`;
}

/**
 * 기관의 후원 QR 코드를 보장한다.
 *
 * 마이그레이션으로 등록된 기관은 qrCodeUrl이 비어 있어 상세 페이지에서 QR이 표시되지 않았다.
 * 1) Organization.qrCodeUrl 이 있으면 그대로 사용
 * 2) 없으면 QrCode 테이블의 활성 레코드를 사용하고 Organization에 동기화
 * 3) 둘 다 없으면 즉시 발급(생성 + 저장)
 *
 * 발급 실패 시에는 null을 반환해 화면에서 "QR코드 미등록" 안내가 나오도록 한다.
 *
 * QR에 인코딩되는 주소는 재발급 API와 동일하게 서버 설정값(NEXT_PUBLIC_APP_URL)을 사용한다.
 * (Host 헤더는 조작 가능하므로 영구 저장되는 이미지의 대상 주소로 신뢰하지 않는다.)
 */
export async function ensureOrgQrCode(
  org: { id: string; slug: string; qrCodeUrl: string | null }
): Promise<string | null> {
  if (org.qrCodeUrl) return org.qrCodeUrl;

  const targetUrl = donatePageUrl(org.slug);

  try {
    const existing = await prisma.qrCode.findFirst({
      where: { organizationId: org.id, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { imageDataUrl: true },
    });
    if (existing?.imageDataUrl) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { qrCodeUrl: existing.imageDataUrl },
      });
      return existing.imageDataUrl;
    }

    const imageDataUrl = await generateQrDataUrl(targetUrl);
    await prisma.$transaction([
      prisma.qrCode.create({ data: { organizationId: org.id, targetUrl, imageDataUrl } }),
      prisma.organization.update({ where: { id: org.id }, data: { qrCodeUrl: imageDataUrl } }),
    ]);
    return imageDataUrl;
  } catch (e) {
    console.error("[qr] QR 코드 자동 발급 실패", e);
    return null;
  }
}
