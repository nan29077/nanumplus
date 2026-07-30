import QRCode from "qrcode";

export async function generateQrDataUrl(targetUrl: string): Promise<string> {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#114032", light: "#FFFFFF" },
  });
}

export function donatePageUrl(slug: string, base?: string) {
  const resolvedBase = base ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${resolvedBase}/donate/${slug}`;
}
