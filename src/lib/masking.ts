/** 010-****-1234 형태 마스킹 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone.replace(/.(?=.{2})/g, "*");
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-****-${tail}`;
}

/** ki***@example.com 형태 마스킹 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "-";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export function maskName(name?: string | null): string {
  if (!name) return "-";
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
