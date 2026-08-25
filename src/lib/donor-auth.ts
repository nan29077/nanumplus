import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export type DonorSession = {
  donorAccountId: string;
  name: string;
  email: string | null;
  image: string | null;
};

/** 현재 로그인한 후원자 세션 반환 (후원자가 아니면 null) */
export async function getDonorSession(): Promise<DonorSession | null> {
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u || u.kind !== "donor" || !u.donorAccountId) return null;
  return {
    donorAccountId: u.donorAccountId,
    name: u.name ?? "후원자",
    email: u.email || null,
    image: u.image ?? null,
  };
}

/** 후원자 전용 페이지 보호: 비로그인 시 후원자 로그인으로 */
export async function requireDonor(callbackPath = "/my"): Promise<DonorSession> {
  const donor = await getDonorSession();
  if (!donor) redirect(`/donor/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  return donor;
}
