import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, MapPin, Megaphone, Users } from "lucide-react";
import { getOrganizationAvatar } from "@/lib/organization-avatar";

export function OrganizationCard({
  name,
  slug,
  logoUrl,
  description,
  address,
  donorCount,
  campaignCount,
}: {
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  donorCount: number;
  campaignCount: number;
}) {
  return (
    <Link
      href={`/organizations/${slug}`}
      className="group flex h-full flex-col rounded-[1.75rem] border border-[#eadfce] bg-white p-5 shadow-[0_12px_40px_rgba(91,65,40,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#d9c4a7] hover:shadow-[0_18px_48px_rgba(91,65,40,0.14)]"
    >
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <Image src={logoUrl} alt={`${name} 로고`} fill unoptimized className="object-cover" />
          </span>
        ) : (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
            <Image src={getOrganizationAvatar(name)} alt={`${name} 프로필 캐릭터`} fill sizes="64px" className="object-cover" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-stone-900">{name}</h3>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-brand-600" />
          </div>
          {address && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-stone-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{address}</span>
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-stone-500">
        {description || "지역사회 이웃들의 더 나은 일상을 위해 곁에서 따뜻한 나눔을 이어가고 있습니다."}
      </p>

      <div className="mt-auto flex items-center gap-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#c4785b]" /> 후원자 {donorCount.toLocaleString("ko-KR")}명
        </span>
        <span className="flex items-center gap-1.5">
          <Megaphone className="h-4 w-4 text-brand-600" /> 캠페인 {campaignCount.toLocaleString("ko-KR")}개
        </span>
        <Heart className="ml-auto h-4 w-4 text-[#d9a08a] transition group-hover:fill-[#d9a08a]" />
      </div>
    </Link>
  );
}
