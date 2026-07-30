/** 사용자 입력 텍스트 sanitize (XSS 방지 — 출력은 React가 escape하지만, 저장 전 제어문자/태그 제거) */
export function sanitizeText(input: unknown, maxLen = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // 태그 제거
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
