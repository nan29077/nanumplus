"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Org = { id: string; name: string };

export function SmsOrgSelect({
  orgs,
  currentOrgId,
}: {
  orgs: Org[];
  currentOrgId: string | undefined;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (val === "") {
      params.delete("orgId");
    } else {
      params.set("orgId", val);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      value={currentOrgId ?? ""}
      onChange={handleChange}
      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
    >
      <option value="">전체 기관</option>
      <option value="__unassigned__">기관배정 없음</option>
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
